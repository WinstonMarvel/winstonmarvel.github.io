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
        const posts = collectionApi.getFilteredByTag('post');
        return generateCategoryToPostMapping(posts)
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
  
  // Generates a tree of categories -> posts
  function generateCategoryToPostMapping(posts) {
    const categoryMapping = new Map();
    for(const post of posts) {
      const {categories, title} = post.data
      const {url} = post
      for(const category of categories) {
        if(!categoryMapping.has(category)) {
          categoryMapping.set(category, {
            posts: []
          })
        }
        const cat = categoryMapping.get(category)
        cat.posts.push({url, title})
      }
    }

    // Convert to easy-to-use structure
    const simplifiedOutput = []
    for(const [key, value] of categoryMapping.entries()) {
      simplifiedOutput.push({
        title: key,
        posts: value.posts
      })
    }

    return simplifiedOutput
  }