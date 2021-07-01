require('dotenv').config();

const { promises: fs } = require('fs');
const path = require('path');
const grayMatter = require('gray-matter');
const WPAPI = require('wpapi');
const marked = require('marked');

const POSTS_DIRECTORY = process.env.POSTS_DIRECTORY;
const PREFIX = '[MD to WP]';

const wp = new WPAPI({
  endpoint: 'https://colbyfayockcom.wpengine.com/wp-json',
  username: process.env.WPAPI_APPLICATION_USERNAME,
  password: process.env.WPAPI_APPLICATION_PASSWORD
});

async function run() {
  const errors = [];

  const filenames = await fs.readdir(POSTS_DIRECTORY);

  // Find all markdown files at the given directory and grab the file content

  const files = await Promise.all(filenames.map(async filename => {
    const filePath = path.join(POSTS_DIRECTORY, filename)
    const content = await fs.readFile(filePath, 'utf8')
    return {
      filename,
      content
    }
  }));

  console.log(`${PREFIX} Found ${files.length} files...`);

  // Create a new document object for each file and parse the content
  // from markdown into html

  const documents = files.map((file, index) => {
    console.log(`${PREFIX} Parsing file ${index + 1}/${files.length}`);
    const matter = grayMatter(file.content);
    const { data, content } = matter;
    const html = marked(content);
    return {
      ...data,
      html
    }
  });

  // Collect all of the possible categories from the documents and create a
  // Set to avoid duplicates

  const documentCategories = [...new Set(documents.map(document => document.category))];

  console.log(`${PREFIX} Files contain ${documentCategories.length} categories...`);

  // Get all existing categories from the site

  const existingCategories = await wp.categories().get();

  console.log(`${PREFIX} WordPress instance has ${existingCategories.length} existing categories...`);

  // Find all of the categories that don't exist from the documents list

  const categoriesToCreate = documentCategories.filter(category => !existingCategories.find(existingCategory => existingCategory.slug === category));

  console.log(`${PREFIX} Creating ${categoriesToCreate.length} new categories...`);

  // Loop through the categories to create and create them
  // Push the new category to the end of existing cats

  const newCategories = [];

  for ( const category of categoriesToCreate ) {
    try {
      const newCategory = await wp.categories().create({
        name: category,
        slug: category
      });
      newCategories.push(newCategory);
      console.log(`${PREFIX} Created "${category}"`);
    } catch(error) {
      errors.push({
        type: 'CREATE_CATEGORY',
        message: `Could not create category "${category}"`,
        error
      });
      console.log(`${PREFIX} Failed to created "${category}"`);
    }
  }

  const categories = [...existingCategories, ...newCategories];

  // Validating document data before running creation process

  const validationErrors = [];

  documents.forEach(document => {
    if ( !(document.date instanceof Date))  {
      validationErrors.push({
        type: 'DATE',
        message: `Date is not a valid date`,
        data: {
          title: document.title,
          date: document.date
        }
      })
    }
  });

  if ( validationErrors.length > 0 ) {
    console.log(`${PREFIX} ${validationErrors.length} documents failed validation...`);
    console.log(JSON.stringify(validationErrors, null, 2));
    throw new Error(`${validationErrors.length} validation errors`);
  }

  console.log(`${PREFIX} Creating ${documents.length} new posts...`);

  for ( const document of documents ) {
    const category = categories.find(category => category.slug === document.category);
    try {
      await wp.posts().create({
        title: document.title,
        content: document.html,
        categories: [category.id],
        date: document.date,
        status: 'publish'
      });
      console.log(`${PREFIX} Created "${document.title}"`);
    } catch (error) {
      errors.push(error);
      console.log(`${PREFIX} Failed to created "${document.title}"`);
    }
  }

  console.log(`${PREFIX} Finished!`);

  if ( errors.length > 0 ) {
    console.log(`${PREFIX} Errors:`);
    console.log(JSON.stringify(errors, null, 2));
  }
}

run();