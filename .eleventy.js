const { DateTime } = require("luxon")
const pluginNavigation = require("@11ty/eleventy-navigation")
const striptags = require("striptags")
const htmlmin = require("html-minifier-terser")
const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")
const { eleventyImageTransformPlugin } = require("@11ty/eleventy-img")
const pluginPurgeCSS = require("eleventy-plugin-purgecss")

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

    // Copy the `pdf` downloads folders to the output
    eleventyConfig.addPassthroughCopy("web/downloads/pdf")

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

    if (process.env.ELEVENTY_ENV === "production") {
        // Compile SCSS during build
        eleventyConfig.on("beforeBuild", () => {
            execSync("node compileSass.js", {
                stdio: "inherit",
            })
        })

        // Removes unused CSS
        eleventyConfig.addPlugin(pluginPurgeCSS, {
            config: "./purgecss.config.js",
            quiet: false,
        })

        // Optimize images
        eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
            formats: ["avif", "webp", "jpeg"],
            extensions: "html",
            widths: [320, 640, 960, 1280, null],
            // Attributes assigned on <img> nodes override these values
            htmlOptions: {
                imgAttributes: {
                    loading: "lazy",
                    decoding: "async",
                },
                pictureAttributes: {},
            },
            filenameFormat: function (id, src, width, format) {
                const extension = path.extname(src)
                const name = path.basename(src, extension)
                // Return the filename in the format: name-widthw.format
                return createImageFileName(name, format, width)
            },
        })

        // Copy meta assets (favicons, og image, etc.) to root
        eleventyConfig.on("beforeBuild", () => {
            const sourceDir = path.join(__dirname, "web/meta")
            const outputDir = path.join(__dirname, "_site")

            if (fs.existsSync(sourceDir)) {
                const files = fs.readdirSync(sourceDir)
                files.forEach((file) => {
                    fs.copyFileSync(path.join(sourceDir, file), path.join(outputDir, file))
                })
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
    } else {
        // Development mode: copy Images without optimization
        eleventyConfig.addPassthroughCopy("web/img")
    }
    eleventyConfig.addWatchTarget("./_site/css/style.css") // For live reload

    // Post excerpts
    eleventyConfig.addShortcode("excerpt", (article) => extractExcerpt(article))

    // Exclude 'notes' folder from all collections and output
    eleventyConfig.ignores.add("notes/**")

    // Add a shortcode to get Image URL after optimization
    eleventyConfig.addFilter("imgUrl", getImageURL)

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

// Get an image URL of an image after optimization is complete with correct width and format
// This is not a very useful function. Todo: Rethink and improve.
function getImageURL(imgPath, width, format = "webp") {
    if (!imgPath) return ""

    const originalFileName = imgPath.split(".")[0]
    const resultFileName = createImageFileName(originalFileName, format, width)

    const resultFilePath = path.join(__dirname, "_site", "img", resultFileName)

    if (!fs.existsSync(resultFilePath)) {
        console.warn(`Image file not found in /img: ${resultFileName}.`)
    }

    return `/img/${resultFileName}`
}

// Generates a filename for images in the format: name-widthw.format
function createImageFileName(name, format, width) {
    // Return the filename in the format: name-widthw.format
    return `${name}-${width}w.${format}`
}
