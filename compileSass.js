const sass = require('node-sass');
const CleanCSS = require('clean-css');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'web', 'scss', 'style.sass');
const outputPath = path.join(__dirname, '_site', 'css', 'style.css');

// Compile Sass to CSS
sass.render({
  file: inputPath,
  outputStyle: 'expanded'
}, function(err, result) {
  if (err) {
    console.error(err);
    return;
  }

  // Minify the compiled CSS
  const minifiedCSS = new CleanCSS({}).minify(result.css).styles;

  // Ensure the output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // Write the minified CSS to the output file
  fs.writeFileSync(outputPath, minifiedCSS);
  console.log('CSS compiled and minified successfully.');
});
