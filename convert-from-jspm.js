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
  'npm': (p) => p.replace(/.*@([0-9.])/, '$1'),
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

    if (jspmDeps[label].indexOf('github:systemjs/') !== -1) {
      console.log(`Skipping ${label} as it is a jspm plugin`);
      delete jspmDeps[label];
    } else if (prefixes[prefix]) {
      const convertedLabel = label.replace(/^.+\//, '');
      packageDeps[convertedLabel] = prefixes[prefix](jspmDeps[label].replace(/(npm|github):/, ''));
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

  fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, '\t'), (err) => {
    if (err) throw err;
  });
} else {
  console.warn('There are remaining dependencies to be migrated. Please fix these manually and remove the jspm section from your package.js');
}
