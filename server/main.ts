
/**
 * Dotenv is a zero-dependency module that loads environment variables from a .env file into process.env.
 * Storing configuration in the environment separate from code is based on The Twelve-Factor App methodology:
 *
 * https://12factor.net/
 *
 */
const dotenv = require("dotenv");

const result = dotenv.config();

if (result.error) {
    throw result.error;
}
// uncomment to see the content of your environment variables
console.log("Loaded environment config: ", result.parsed);

/**
 * It is very important that before importing any file we ensure that the
 * environment variables were loaded correctly. Because any of the imported
 * files could use the environment variables.
 *
 * Due to above condition, if the .env file could not be loaded then the process
 * sends an Exception throwing the error from dotenv package.
 *
 */
import {initServer} from './server';

initServer();
