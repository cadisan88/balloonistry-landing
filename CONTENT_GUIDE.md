# Content guide

This guide shows you how to change the website yourself. You can add or change products, categories, photos and questions.

You work on GitHub, in your web browser. You do not need to install anything.

---

## 1. How it works

1. You change a file on GitHub.
2. You click **Commit changes**.
3. Cloudflare builds the new website. This takes about 1 to 2 minutes.
4. The new website goes online.

**If there is a mistake in your file, nothing breaks.** The build stops, and the old website stays online. On GitHub you see a red **✗** next to your change. Click it to read the error, fix the file, and commit again. A green **✓** means your change is online.

### Open the files

1. Go to the project on GitHub.
2. Click the folder `src`, then `content`.
3. You see these folders:

| Folder       | What is inside             |
| ------------ | -------------------------- |
| `products`   | One file for each product  |
| `categories` | One file for each category |
| `faq`        | One file for each question |
| `pages`      | The About page             |
| `policies`   | The policy pages           |

### Change a file

1. Click the file.
2. Click the **pencil** icon (Edit).
3. Make your change.
4. Click **Commit changes**, then **Commit changes** again.

### Make a new file

1. Open the folder.
2. Click **Add file**, then **Create new file**.
3. Type the file name.
4. Write the text.
5. Click **Commit changes**.

---

## 2. Rules for every file

- **The file name is the web address.** The file `hot-air-balloon.md` becomes `balloonistry.ca/products/hot-air-balloon/`.
- File names use **small letters, numbers and dashes only**. No spaces, no capital letters, no accents.
  - Good: `pink-heart-bouquet.md`
  - Bad: `Pink Heart Bouquet.md`
- Do not change the name of a file that is already online. The old web address will stop working. Ask the developer first.
- At the top of a `.md` file there is a block between two lines of `---`. Keep both `---` lines.
- Use spaces, not tabs.
- If a text has a colon (`:`), put it in quotes: `name: "Love: The Bouquet"`.
- Prices are numbers only: `price: 75`. Not `$75`, not `75.00`.

---

## 3. Photos

### Good photos

- Product photos: **square**, at least **1200 × 1200 pixels**, on a plain or soft background.
- File type: `.jpg`, `.png` or `.webp`.
- File name: small letters and dashes, like `hot-air-balloon-1.jpg`.

You do not need to make photos smaller. The website does it.

### Upload a photo

1. Go to `src`, then `assets`, then `products`.
2. Click **Add file**, then **Upload files**.
3. Drag your photo in.
4. Click **Commit changes**.

For a category photo, use the folder `src/assets/categories` the same way.

### Use the photo

In the product file, write the photo like this:

```
images:
  - ../../assets/products/hot-air-balloon-1.jpg
```

Write `../../assets/products/` and then the exact file name. If the name is wrong, the build stops with an error that says it could not find the image.

---

## 4. Add a product

1. Upload the photo (see section 3).
2. Go to `src/content/products`.
3. Click **Add file**, then **Create new file**.
4. Name it, for example `pink-heart-bouquet.md`.
5. Copy this and change the values:

```
---
name: Pink Heart Bouquet
price: 65
categories: [balloon-bouquets, valentines-collection]
tags: [new]
images:
  - ../../assets/products/pink-heart-bouquet-1.jpg
  - ../../assets/products/pink-heart-bouquet-2.jpg
featured: false
order: 100
---

Write the description here. It can be a few short sentences.

You can start a new paragraph after an empty line.
```

6. Click **Commit changes**.

### What each line means

| Line         | Must I write it? | What it does                                                                                                                         |
| ------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `name`       | Yes              | The product name.                                                                                                                    |
| `price`      | No               | The website shows "From $65". Without a price, it shows "Request a quote".                                                           |
| `categories` | Yes              | One or more category file names, in `[ ]`, with commas. The first one is the main category.                                          |
| `tags`       | No               | `[new]`, `[best-seller]`, or both: `[new, best-seller]`.                                                                             |
| `images`     | Yes              | One or more photos. The first photo is the main photo.                                                                               |
| `imageAlt`   | No               | A short text that describes the main photo, for people who cannot see it. Example: `imageAlt: Pink heart balloons with gold ribbon`. |
| `featured`   | No               | `true` shows the product on the home page. The home page shows up to 8.                                                              |
| `available`  | No               | `false` hides the product everywhere.                                                                                                |
| `order`      | No               | A number for the order in lists. Small numbers come first. Products with the same number are sorted by name.                         |

The category names must be the **file names** in `src/content/categories`, without `.json`. For example `balloon-bouquets`, not `Balloon Bouquets`. A wrong name stops the build with the error "Unknown category".

---

## 5. Change a product

Open the file in `src/content/products` and click the pencil.

- **New price:** change the number after `price:`.
- **New description:** change the text under the second `---`.
- **More photos:** upload them, then add more `- ../../assets/products/...` lines under `images:`.
- **Show on the home page:** `featured: true`.
- **Hide for now** (for example, sold out or seasonal): add the line `available: false`. To show it again, change it to `true` or delete the line.

---

## 6. Categories

Category files are in `src/content/categories`. They end in `.json` and look like this:

```json
{
  "name": "Valentine's Collection",
  "description": "Balloons and gifts for the people you love.",
  "order": 50,
  "visible": true
}
```

| Line          | What it does                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `name`        | The category name on the website.                                                               |
| `description` | A short text under the name.                                                                    |
| `image`       | Optional photo for the category tile, like `"image": "../../assets/categories/valentines.jpg"`. |
| `order`       | Small numbers come first.                                                                       |
| `visible`     | `false` hides the category everywhere (good for seasonal categories).                           |

### Add a category

1. Go to `src/content/categories`.
2. Create a new file, for example `mothers-day.json`.
3. Copy the example above and change the values.
4. Commit.
5. Add the new name (`mothers-day`) to the `categories` line of each product that belongs in it.

### JSON rules

JSON files are strict:

- Every text is in **double quotes** `"`.
- Every line, except the last one, ends with a **comma**.
- `true`, `false` and numbers have no quotes.

---

## 7. Questions (FAQ)

Question files are in `src/content/faq`. Each file is one question:

```
---
question: Do you deliver, and where?
group: delivery-pickup
order: 10
---

Write the answer here.
```

| Line       | What it does                                                            |
| ---------- | ----------------------------------------------------------------------- |
| `question` | The question, as people see it.                                         |
| `group`    | One of: `ordering`, `delivery-pickup`, `products`, `events`, `payment`. |
| `order`    | The order inside the group. Small numbers come first.                   |

To answer a question, open the file and replace the line that starts with `TODO:` with your answer.

To add a question, create a new file in `src/content/faq` (for example `gift-cards.md`) and copy the example above.

---

## 8. About page and policies

- **About:** `src/content/pages/about.md`. Change the text under the second `---`. Also change `description:`, a short sentence for Google.
- **Policies:** the files in `src/content/policies`. Change the text, and set `updated:` to today's date, like `updated: 2027-01-15`.

You can use simple formatting in the text:

```
## A heading

A normal paragraph.

- A list item
- Another list item

**Bold text** and a [link](https://www.balloonistry.ca/contact/).
```

---

## 9. Things the developer changes

Ask the developer to change these. They are not in the content folders:

- Phone number, email, address, Instagram and Facebook links
- Business hours
- The photos on the home page and the Events page
- The text on buttons and section titles
- Colours and fonts

---

## 10. Common mistakes

| Error or problem                                     | Fix                                                                                                       |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| "Unknown category"                                   | Use the category **file name** (`gift-balloons`), not the title.                                          |
| "Could not find requested image"                     | Check the photo name and the path `../../assets/products/`. Names must match exactly, with small letters. |
| "data does not match collection schema" and `price`  | The price must be a number above 0, without `$`.                                                          |
| The build fails right after you edited the top block | Check that both `---` lines are there and that you used spaces, not tabs.                                 |
| A JSON file fails                                    | Look for a missing comma, a missing quote, or an extra comma after the last line.                         |
| The product does not show in the shop                | Check `available` is not `false`, and that at least one of its categories has `"visible": true`.          |
| You do not see your change                           | Wait 2 minutes, then reload the page. Check for a green ✓ on GitHub.                                      |

If you are stuck, send the developer a link to the change on GitHub and a screenshot of the error.
