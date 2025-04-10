# Multi-Select Autocomplete Component

A flexible JavaScript component that enhances a standard HTML input field into a powerful multi-select autocomplete/tagging system. It allows users to select multiple items from a predefined list with suggestions, add custom items, and manage their selections easily using both mouse and keyboard.

## Features

* **Autocomplete Suggestions:** Provides suggestions as the user types, filtered from a provided list.
* **Tag-Based Input:** Displays selected items as distinct tags within the input area.
* **Multiple Selection Modes:**
    * **Multi-Select:** Use `Spacebar` or `Click` on a suggestion to select it while keeping the input field and suggestion list open for further selections based on the same query.
    * **Single-Select / Add & Reset:** Use `Enter` on a highlighted suggestion (or when no suggestion is highlighted) to select/add the item, clear the input field, and close the suggestion list, ready for the next entry.
* **Add Custom Items:** If the typed text doesn't match any suggestions, an option `+ Add "[typed text]"` appears, allowing users to add new, custom tags.
* **Keyboard Navigation:** Fully navigable via keyboard (Up/Down Arrows, Enter, Spacebar, Escape).
* **Easy Management:** Remove individual tags by clicking their 'x' icon or clear all tags with a dedicated button.
* **Configurable:** Customize behavior and appearance through initialization options (suggestion list, initial selection, placeholder text, CSS classes, callbacks).
* **Public API:** Interact with the component programmatically after initialization (get selections, add/remove items, clear, destroy).
* **Basic ARIA Support:** Includes roles and attributes (`combobox`, `listbox`, `aria-expanded`, etc.) for improved accessibility.

## Installation / Setup

1.  **Download:** Download the `MultiSelectAutocomplete.js` and `multi-select-autocomplete.css` files from this repository.
2.  **Include Files:** Place the files in your project directory and include them in your HTML file:

    ```html
    <!DOCTYPE html>
    <html>
    <head>
        <title>My Page</title>
        <link rel="stylesheet" href="path/to/multi-select-autocomplete.css">
    </head>
    <body>
        <input type="text" id="my-autocomplete-input">

        <script src="path/to/MultiSelectAutocomplete.js"></script>
        <script>
            // Initialize the component (see Usage below)
        </script>
    </body>
    </html>
    ```

    *(Remember to replace `"path/to/"` with the actual path to the files.)*

## Usage

1.  **HTML:** Create a standard text input element in your HTML with a unique ID.

    ```html
    <input type="text" id="tech-selector">
    ```

2.  **JavaScript:** After including the `MultiSelectAutocomplete.js` script, create a new instance of the class, passing the input element's selector (or the element itself) and an options object. The `suggestions` array is required.

    ```javascript
    document.addEventListener('DOMContentLoaded', () => {
        const availableTech = [
            'JavaScript', 'Python', 'Java', 'C#', 'C++', 'PHP', 'Ruby', 'Go',
            'Swift', 'Kotlin', 'TypeScript', 'HTML', 'CSS', 'React', 'Angular',
            'Vue.js', 'Node.js', 'Django', 'Flask', 'Spring Boot', 'SQL', 'MongoDB'
            // ...add more suggestions
        ];

        const techSelectorInstance = new MultiSelectAutocomplete('#tech-selector', {
            suggestions: availableTech,          // Required: Array of suggestion strings
            placeholder: 'Select or add tech...', // Optional: Placeholder text
            selected: ['JavaScript', 'React']   // Optional: Pre-selected items
        });

        // Example: Get selected items later (e.g., on form submit)
        const myButton = document.getElementById('my-save-button'); // Assuming you have a save button
        if (myButton) {
            myButton.addEventListener('click', () => {
                const selectedItems = techSelectorInstance.getSelectedItems();
                console.log('Selected Technologies:', selectedItems);
                // Output: Selected Technologies: ['JavaScript', 'React'] (or whatever is selected)
            });
        }
    });
    ```

## Configuration Options

You can customize the component by passing an options object as the second argument to the constructor `new MultiSelectAutocomplete(selector, options)`.

| Option                 | Type       | Default                                   | Description                                                                                                                                |
| :--------------------- | :--------- | :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| `suggestions`          | `Array`    | `[]`                                      | **Required.** An array of strings representing the available autocomplete suggestions. Duplicates and empty strings will be filtered out. |
| `selected`             | `Array`    | `[]`                                      | An array of strings to be pre-selected when the component initializes. Items not matching suggestions might be ignored based on setup.   |
| `placeholder`          | `String`   | `'Type to search...'`                     | Placeholder text for the input field.                                                                                                      |
| `maxSuggestions`       | `Number`   | `10`                                      | Maximum number of suggestions to display in the dropdown list at once.                                                                     |
| `wrapperClass`         | `String`   | `'autocomplete-container'`                | CSS class for the main container div wrapping the input and tags.                                                                          |
| `labelsClass`          | `String`   | `'selected-labels-container'`             | CSS class for the div containing the selected item labels (tags).                                                                          |
| `labelClass`           | `String`   | `'selected-label'`                        | CSS class applied to each individual selected item label (tag).                                                                            |
| `removeClass`          | `String`   | `'remove-label-btn'`                      | CSS class for the 'x' button used to remove an individual label.                                                                           |
| `clearClass`           | `String`   | `'clear-all-btn'`                         | CSS class for the 'X' button used to clear all selected items.                                                                             |
| `inputClass`           | `String`   | `'autocomplete-input'`                    | Optional CSS class to apply directly to the original `<input>` element.                                                                    |
| `suggestionsListClass` | `String`   | `'suggestions-list'`                      | CSS class for the `<ul>` element that displays the suggestions dropdown.                                                                   |
| `suggestionItemClass`  | `String`   | `'suggestion-item'`                       | CSS class applied to each `<li>` suggestion item in the dropdown.                                                                          |
| `highlightClass`       | `String`   | `'highlighted'`                           | CSS class applied to the currently highlighted suggestion item during keyboard navigation.                                                   |
| `onAdd`                | `Function` | `(item) => {}`                          | Callback function executed after an item is successfully added. Receives the added item string as an argument.                           |
| `onRemove`             | `Function` | `(item) => {}`                          | Callback function executed after an item is successfully removed. Receives the removed item string as an argument.                         |
| `onClearAll`           | `Function` | `(removedItems) => {}`                  | Callback function executed after all items are cleared via the clear button. Receives an array of the items that were removed.             |

## Public API Methods

Once you have an instance of the component (`const myInstance = new MultiSelectAutocomplete(...)`), you can call the following methods on it:

* **`getSelectedItems()`**: Returns an array containing the strings of the currently selected items.
    ```javascript
    const currentSelection = myInstance.getSelectedItems();
    console.log(currentSelection); // e.g., ['React', 'Node.js']
    ```
* **`addItem(itemText)`**: Programmatically adds an item. It checks if the item (trimmed) is already selected (case-insensitive). Returns `true` if added, `false` otherwise.
    ```javascript
    myInstance.addItem('  Vue.js  '); // Adds 'Vue.js' if not already selected
    ```
* **`removeItem(itemText)`**: Programmatically removes an item (case-insensitive comparison). Returns `true` if removed, `false` otherwise.
    ```javascript
    myInstance.removeItem('react'); // Removes 'React' if selected
    ```
* **`clearSelection()`**: Programmatically removes all selected items.
    ```javascript
    myInstance.clearSelection();
    ```
* **`destroy()`**: Removes the component's functionality, event listeners, and added DOM elements, restoring the original input field as much as possible. Useful for cleanup in single-page applications or dynamic environments.
    ```javascript
    myInstance.destroy();
    ```

## Styling

The component relies on the provided `multi-select-autocomplete.css` file for its appearance. You can:

1.  **Use the default styles:** Include the CSS file as is.
2.  **Customize:** Modify `multi-select-autocomplete.css` directly to change colors, padding, borders, etc.
3.  **Override:** Include the default CSS and then add your own CSS rules later in your stylesheet to override specific styles (e.g., change the label background color by targeting `.selected-label`).
4.  **Use Custom Classes:** Pass different class names via the configuration options (`wrapperClass`, `labelClass`, etc.) and style those classes in your own CSS file.

## License

This project is licensed under the MIT License - see the LICENSE file for details.