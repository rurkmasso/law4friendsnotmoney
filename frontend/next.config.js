/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",           // static export for GitHub Pages
  basePath: process.env.NODE_ENV === "production" ? "/law4friendsnotmoney" : "",
  images: { unoptimized: true },
  trailingSlash: true,
};

module.exports = nextConfig;
