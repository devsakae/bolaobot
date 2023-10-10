
const getCommand = (raw) => {
  const divide = raw.split(' ');
  if (divide.length > 1) return raw.substring(divide[0].length).trimStart();
  return false;
}

module.exports = {
  getCommand
}