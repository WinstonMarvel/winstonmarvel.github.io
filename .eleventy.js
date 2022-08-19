const { DateTime } = require("luxon");
const pluginNavigation = require("@11ty/eleventy-navigation");
const eleventySass = require('eleventy-sass')
const striptags = require("striptags");

module.exports = (eleventyConfig) => {
    
    // Copy the `img` and `js` folders to the output
    eleventyConfig.addPassthroughCopy("web/img");
    eleventyConfig.addPassthroughCopy("web/js");

    eleventyConfig.addPlugin(pluginNavigation);

    // Date formatting
    eleventyConfig.addFilter("readableDate", dateObj => {
      return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat("dd LLL yyyy");
    });

    // Create a collection of categories
    eleventyConfig.addCollection("categories", (collectionApi) => {
        const categories = new Set();
        const posts = collectionApi.getFilteredByTag('post');
        for(const post of posts) {
            for(const c of post.data.categories) {
                categories.add(c)
            }
        }
        return [...categories];
    });

    // Compile SCSS
    eleventyConfig.addPlugin(eleventySass);

    // Post excerpts
    eleventyConfig.addShortcode("excerpt", (article) => extractExcerpt(article));

    return {
        dir: {
            input: "web",
            includes: "_includes",
            data: "_data",
            output: "_site"
        }
    }
}

function extractExcerpt(article) {
    if (!article.hasOwnProperty("templateContent")) {
      console.warn(
        'Failed to extract excerpt: Document has no property "templateContent".'
      );
      return null;
    }
  
    let excerpt = null;
    const content = article.templateContent;
  
    excerpt = striptags(content)
      .substring(0, 100) // Cap at 200 characters
      .replace(/^\s+|\s+$|\s+(?=\s)/g, "")
      .trim()
      .concat("...");
    return excerpt;
  }
  