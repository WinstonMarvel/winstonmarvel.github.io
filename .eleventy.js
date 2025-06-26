const { DateTime } = require("luxon")
const pluginNavigation = require("@11ty/eleventy-navigation")
const striptags = require("striptags")
const htmlmin = require("html-minifier-terser")
const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

module.exports = (eleventyConfig) => {
    // Global data variables
    eleventyConfig.addGlobalData("baseURL", "https://winstonmarvel.com")

    // Custom filter to inline and minify JavaScript
    eleventyConfig.addShortcode("inlineJS", function (jsFilePath) {
        const filePath = path.resolve(__dirname, "web", jsFilePath)
        try {
            const fileContent = fs.readFileSync(filePath, "utf8")
            // Return the content wrapped in a script tag
            return `<script>${fileContent}</script>`
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error)
            return ""
        }
    })

    // Minify HTML
    eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
        if (outputPath && outputPath.endsWith(".html")) {
            return htmlmin.minify(content, {
                removeComments: true,
                collapseWhitespace: true,
                minifyCSS: true,
                minifyJS: true,
            })
        }
        return content
    })

    // Copy the `pdf` downloads folders to the output
    eleventyConfig.addPassthroughCopy("web/downloads/pdf")
    eleventyConfig.addPassthroughCopy("web/img")

    eleventyConfig.addPlugin(pluginNavigation)

    // Date formatting
    eleventyConfig.addFilter("readableDate", (dateObj) => {
        return DateTime.fromJSDate(dateObj, {
            zone: "utc",
        }).toFormat("dd LLL yyyy")
    })

    // Create a collection of categories
    eleventyConfig.addCollection("categories", (collectionApi) => {
        const posts = collectionApi.getFilteredByTag("post")
        return generateCategoryToPostMapping(posts)
    })

    // Compile SCSS
    eleventyConfig.on("beforeBuild", () => {
        execSync("node compileSass.js", {
            stdio: "inherit",
        })
    })

    // Post excerpts
    eleventyConfig.addShortcode("excerpt", (article) => extractExcerpt(article))

    return {
        dir: {
            input: "web",
            includes: "_includes",
            data: "_data",
            output: "_site",
        },
    }
}

function extractExcerpt(article) {
    if (!("templateContent" in article)) {
        console.warn('Failed to extract excerpt: Document has no property "templateContent".')
        return null
    }

    let excerpt = null
    const content = article.templateContent

    excerpt = striptags(content)
        .substring(0, 100) // Cap at 200 characters
        .replace(/^\s+|\s+$|\s+(?=\s)/g, "")
        .trim()
        .concat("...")
    return excerpt
}

// Generates a tree of categories -> posts
function generateCategoryToPostMapping(posts) {
    const categoryMapping = new Map()
    for (const post of posts) {
        const { categories, title } = post.data
        const { url } = post
        for (const category of categories) {
            if (!categoryMapping.has(category)) {
                categoryMapping.set(category, {
                    posts: [],
                })
            }
            const cat = categoryMapping.get(category)
            cat.posts.push({
                url,
                title,
            })
        }
    }

    // Convert to easy-to-use structure
    const simplifiedOutput = []
    for (const [key, value] of categoryMapping.entries()) {
        simplifiedOutput.push({
            title: key,
            posts: value.posts,
        })
    }

    return simplifiedOutput
}
