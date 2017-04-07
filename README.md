# Convert-from-jspm
Converts a project from jspm to npm + webpack

### Options

`--path`: Path to a project which contains a package.json
`--cleanPostInstall`: Deletes the postInstall script if it contains the text _jspm_
`--prefixes`: A `js` file which contains an object of dependency prefixes and a function that returns a re-written version.

### Prefixes.js

The default prefixes are:
```
{
    npm: (p) => p,
    github: (p) => p
}
```

If you wanted to support your private stash repo you could pass the following

```
// prefixes.js
module.exports = {
    stash: (repo) => "ssh://git@stash.company.com:7999/" + repo
}

// Call with ./convert-from-jspm.js --prefixes prefixes.js --path some/proj
```