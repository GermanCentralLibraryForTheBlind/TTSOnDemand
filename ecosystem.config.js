module.exports = {
    /**
     * Application configuration section
     * http://pm2.keymetrics.io/docs/usage/application-declaration/
     */
    apps: [
        {
            name: "tts-webservice",
            script: "./src/server/tts-webservice.js",
            watch: true,
            env: {
                NODE_ENV: "production"
            }
        }
    ]

    /**
     * Deployment section
     * http://pm2.keymetrics.io/docs/usage/deployment/
     */
    //deploy : {
    //  production : {
    //    user : "node",
    //    host : "212.83.163.1",
    //    ref  : "origin/master",
    //    repo : "git@github.com:repo.git",
    //    path : "/var/www/production",
    //    "post-deploy" : "npm install && pm2 startOrRestart ecosystem.json --env production"
    //  },
    //  dev : {
    //    user : "node",
    //    host : "212.83.163.1",
    //    ref  : "origin/master",
    //    repo : "git@github.com:repo.git",
    //    path : "/var/www/development",
    //    "post-deploy" : "npm install && pm2 startOrRestart ecosystem.json --env dev",
    //    env  : {
    //      NODE_ENV: "dev"
    //    }
    //  }
    //}
};
