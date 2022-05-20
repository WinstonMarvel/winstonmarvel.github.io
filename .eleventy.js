const { DateTime } = require("luxon");
const pluginNavigation = require("@11ty/eleventy-navigation");
const eleventySass = require('eleventy-sass')

module.exports = (eleventyConfig) => {
    
    // Copy the `img` and `css` folders to the output
    eleventyConfig.addPassthroughCopy("img");

    eleventyConfig.addPlugin(pluginNavigation);

    // Date formatting
    eleventyConfig.addFilter("readableDate", dateObj => {
      return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat("dd LLL yyyy");
    });

    // Compile SCSS
    eleventyConfig.addPlugin(eleventySass);

    return {
        dir: {
            input: "web",
            includes: "_includes",
            data: "_data",
            output: "_site"
        }
    }
}