import pluginRss from "@11ty/eleventy-plugin-rss";

export default function (eleventyConfig) {
  // Passthrough copy for existing static assets
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("insights.css");
  eleventyConfig.addPassthroughCopy("application.css");
  eleventyConfig.addPassthroughCopy("script.js");
  eleventyConfig.addPassthroughCopy("application.js");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("favicon.svg");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy("survey.html");
  eleventyConfig.addPassthroughCopy("survey-deep.html");
  eleventyConfig.addPassthroughCopy("application.html");
  eleventyConfig.addPassthroughCopy("admin");

  // Plugins
  eleventyConfig.addPlugin(pluginRss);

  // Filters
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    if (!dateObj) return "";
    const date = typeof dateObj === "string" ? new Date(dateObj) : dateObj;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    });
  });

  eleventyConfig.addFilter("isoDate", (dateObj) => {
    if (!dateObj) return "";
    const date = typeof dateObj === "string" ? new Date(dateObj) : dateObj;
    return date.toISOString().split("T")[0];
  });

  eleventyConfig.addFilter("readingTime", (content) => {
    if (!content) return "1 min read";
    const wordsPerMinute = 200;
    const cleanContent = content.replace(/<\/?[^>]+(>|$)/g, "");
    const wordCount = cleanContent.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  });

  // Insights collection: all markdown files inside content/insights/
  eleventyConfig.addCollection("insights", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("content/insights/*.md")
      .filter((post) => !post.data.draft)
      .sort((a, b) => b.date - a.date);
  });

  // Recent 3 insights for homepage
  eleventyConfig.addCollection("recentInsights", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("content/insights/*.md")
      .filter((post) => !post.data.draft)
      .sort((a, b) => b.date - a.date)
      .slice(0, 3);
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["html", "njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
}
