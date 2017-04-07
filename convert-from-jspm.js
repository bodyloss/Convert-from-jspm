#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const commandLineArgs = require('command-line-args');

const optionDefinitions = [
  { name: 'path', type: String, defaultOption:true},
  { name: 'cleanPostInstall', type: Boolean, alias: 'c', defaultValue: false},
  { name: "prefixes", type: String, alias: 'p'}
];

const options = commandLineArgs(optionDefinitions);

if (!options.path) {
  console.error('Required argument --path is missing');
  process.exit(-1);
}

let prefixes = {
  'npm': (p) => p,
  'github': (p) => p
};
if (options.prefixes && fs.existsSync(options.prefixes)) {
  const extraPrefixes = require('./' + options.prefixes);
  prefixes = Object.assign(prefixes, extraPrefixes);
}

const packageJsonPath = path.resolve(`${options.path}/package.json`);
if (!fs.existsSync(packageJsonPath)) {
  console.error(`Could not find package.json at ${packageJsonPath}`);
  process.exit(-1);
}

const packageJson = require(packageJsonPath);
packageJson.dependencies = packageJson.dependencies || {};
packageJson.devDependencies = packageJson.devDependencies || {};

const jspmConfigPath = path.resolve(`${options.path}/${packageJson.jspm.configFile}`);
if (!fs.existsSync(jspmConfigPath)) {
  console.error(`Could not find jspm config at ${jspmConfigPath}`);
  process.exit(-1);
}

// let jspmConfig;
// // Declare a global System object that jspm can use to load into, so we can capture it's config
// System = {
//   config: (conf) => {
//     jspmConfig = conf;
//   }
// }
// require(jspmConfigPath);


if (packageJson.dependencies.jspm) {
  delete packageJson.dependencies.jspm;
}

if (packageJson.scripts.postinstall && packageJson.scripts.postinstall.indexOf('jspm') !== -1 && options.removePostInstall) {
  delete packageJson.scripts.postinstall;
}

if (packageJson.scripts.jspmInstall) {
  delete packageJson.scripts.jspmInstall;
}

function processDependencies(jspmDeps) {
  let packageDeps = {};
  Object.keys(jspmDeps).forEach(label => {
    let value = jspmDeps[label];
    let prefix = value.substr(0, value.indexOf(':'));

    if (prefixes[prefix]) {
      packageDeps[label] = prefixes[prefix](jspmDeps[label].replace(/(npm|github):/, ''));
      delete jspmDeps[label];
    } else {
      console.log(`Couldn't remove jspm dependency ${label}:${jspmDeps[label]} as don't know how to process it`);
    }
  });
  return packageDeps;
}

packageJson.dependencies = Object.assign(packageJson.dependencies, processDependencies(packageJson.jspm.dependencies));
packageJson.devDependencies = Object.assign(packageJson.devDependencies, processDependencies(packageJson.jspm.devDependencies));

if (Object.keys(packageJson.jspm.dependencies).length == 0 && Object.keys(packageJson.jspm.devDependencies).length == 0) {
  delete packageJson.jspm;
  console.log(JSON.stringify(packageJson, null, '\t'));
} else {
  console.warn('There are remaining dependencies to be migrated. Please fix these manually and remove the jspm section from your package.js');
}