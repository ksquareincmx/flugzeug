"use strict";
const Generator = require("yeoman-generator");
const chalk = require("chalk");
const base64url = require("base64-url");
const crypto = require("crypto");
const _ = require("lodash");

const logo = `                                 
  _____ _                         
 |   __| |_ _ ___ ___ ___ _ _ ___ 
 |   __| | | | . |- _| -_| | | . |
 |__|  |_|___|_  |___|___|___|_  |
             |___|           |___|
`;

module.exports = class extends Generator {
  _makeName(name) {
    name = _.kebabCase(name);
    return name;
  }

  prompting() {
    this.log(logo + "\nWelcome to the " + chalk.red("Flugzeug") + " generator\n");

    const prompts = [
      {
        type: "input",
        name: "name",
        message: "Your project name",
        default: this._makeName(this.appname),
        filter: this._makeName
      },
      {
        type: "input",
        name: "author",
        message: "Author:",
        default: "Me <me@example.com>",
        store: true
      },
      {
        type: "input",
        name: "dbname",
        message: "MySQL Database name:",
        default: "flugzeug-project"
      },
      {
        type: "confirm",
        name: "websockets",
        message: "Use websockets?",
        default: false
      }
    ];

    return this.prompt(prompts).then(props => {
      this.props = props;
    });
  }

  _generateJwtSecret() {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(32, (err, buf) => {
        if (err) return reject(err);
        this.token = base64url.encode(buf);
        return resolve(this.token);
      });
    });
  }

  writing() {
    // Copy all non-template files
    this.fs.copy(this.templatePath(""), this.destinationPath(""), {
      globOptions: {
        dot: true,
        ignore: "**/*.template"
      }
    });

    // Copy templates
    this.fs.copyTpl(
      this.templatePath("package.json.template"),
      this.destinationPath("package.json"),
      {
        name: this.props.name,
        author: this.props.author,
        useWebsockets: this.props.websockets
      }
    );
    this.fs.copyTpl(
      this.templatePath("README.md.template"),
      this.destinationPath("README.md"),
      {
        name: this.props.name
      }
    );

    this.fs.copyTpl(
      this.templatePath("app/main.ts.template"),
      this.destinationPath("app/main.ts"),
      { useWebsockets: this.props.websockets }
    );
    this.fs.copyTpl(
      this.templatePath("app/server.ts.template"),
      this.destinationPath("app/server.ts"),
      { name: this.props.name }
    );
    if (this.props.websockets)
      this.fs.copyTpl(
        this.templatePath("app/sockets.ts.template"),
        this.destinationPath("app/sockets.ts"),
        {}
      );

    this._generateJwtSecret()
      .then(secret => {
        this.fs.copyTpl(
          this.templatePath("app/config/config.ts.template"),
          this.destinationPath("app/config/config.ts"),
          { dbname: this.props.dbname, jwt_secret: secret }
        );
        this.fs.copyTpl(
          this.templatePath(".env.template"),
          this.destinationPath(".env"),
          {
            dbname: this.props.dbname,
            jwt_secret: secret
          }
        );
        this.fs.copyTpl(
          this.templatePath(".env.example.template"),
          this.destinationPath(".env.example"),
          { dbname: this.props.dbname, jwt_secret: secret }
        );
      })
      .catch(err => {
        this.log("Error generating JWT secret", err);
      });

    this.fs.copyTpl(
      this.templatePath("app/libraries/Log.ts.template"),
      this.destinationPath("app/libraries/Log.ts"),
      { name: this.props.name }
    );
  }

  install() {
    this.installDependencies({
      npm: true,
      bower: false,
      yarn: false
    });
  }
};
