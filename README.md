# Markdown to WordPress

An easy way to get a markdown blog to WordPress!

## Getting Started
* Install dependencies
```
npm install
```
* Create a new `.env` file with the following:
```
WP_JSON_ENDPOINT="https://wordpresswebsite.com/wp-json"
WP_USERNAME="[WordPress Username]"
WP_APPLICATION_PASSWORD="[WordPress Application Password]"
POSTS_DIRECTORY="[Location of markdown post files - Ex: /Users/myname/posts ]"
```
* Upload posts
```
node posts.js
```

## Setup

### Generating a WordPress Application Password
<https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/>
