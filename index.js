// TODO: proper cli
const { downloadPostsOfUser } = require("./dist");
const username = process.argv.slice(2)[0];
if (!username) {
  console.error("Seems like you forgot to input username. Try again.");
  return;
}

downloadPostsOfUser(username);
