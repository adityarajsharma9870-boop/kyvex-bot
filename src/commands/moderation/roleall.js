const massrole = require('./massrole');

module.exports = {
  data: {
    ...massrole.data,
    name: 'roleall',
    description: 'Give a role to all members or remove a role from everyone (Alias of /massrole)',
    toJSON: () => {
      const json = massrole.data.toJSON();
      json.name = 'roleall';
      json.description = 'Give a role to all members or remove a role from everyone (Alias of /massrole)';
      return json;
    }
  },
  execute: massrole.execute
};
