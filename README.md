# Multi-Select Autocomplete Web Component

A flexible, self-contained Web Component that provides a powerful multi-select autocomplete/tagging input. Built using standard Web Component APIs (Custom Elements, Shadow DOM, Templates), it allows users to select multiple items from a list with suggestions, add custom items, and manage selections easily using mouse and keyboard, all encapsulated within a single custom HTML tag.

## Features

* **Encapsulated:** Uses Shadow DOM to keep its internal structure and styles separate, preventing conflicts with page styles.
* **Autocomplete Suggestions:** Provides suggestions as the user types, filtered from a provided list.
* **Tag-Based Input:** Displays selected items as distinct tags within the component.
* **Multiple Selection Modes:**
    * **Multi-Select:** Use `Spacebar` or `Click` on a suggestion to select it while keeping the input field and suggestion list open for further selections.
    * **Single-Select / Add & Reset:** Use `Enter` on a highlighted suggestion (or when no suggestion is highlighted) to select/add the item, clear the input field, and close the suggestion list.
* **Add Custom Items:** If the typed text doesn't match any suggestions, an option `+ Add "[typed text]"` appears.
* **Keyboard Navigation:** Fully navigable via keyboard (Up/Down Arrows, Enter, Spacebar, Escape).
* **Easy Management:** Remove individual tags by clicking their 'x' icon or clear all tags with a dedicated button.
* **Configurable via Attributes:** Customize behavior and appearance through HTML attributes (`suggestions`, `selected`, `placeholder`, etc.).
* **Standard DOM Events:** Communicates changes via standard `CustomEvent`s (`add`, `remove`, `clearall`).
* **Public API:** Interact with the component programmatically using standard DOM methods.
* **Basic ARIA Support:** Includes roles and attributes (`combobox`, `listbox`, `aria-expanded`, etc.) for improved accessibility within the Shadow DOM.

## Installation / Setup

1.  **Download:** Get the component's JavaScript file (e.g., `multi-select-autocomplete-component.js`). The CSS is bundled inside this file.
2.  **Include Script:** Include the JavaScript file in your HTML. Using `defer` is recommended. This script defines the `<multi-select-autocomplete>` custom element.

    ```html
    <!DOCTYPE html>
    <html>
    <head>
        <title>My Page</title>
        </head>
    <body>
        <script src="path/to/multi-select-autocomplete-component.js" defer></script>
        <script>
            // Your script to interact with the component (see Usage)
        </script>
    </body>
    </html>
    ```

    *(Remember to replace `"path/to/"` with the actual path to the JS file.)*

## Usage

1.  **HTML:** Use the custom HTML tag `<multi-select-autocomplete>` directly in your HTML where you want the component to appear. Configure it using attributes.

    ```html
    <multi-select-autocomplete
        id="tech-selector"
        placeholder="Select technologies..."
        suggestions='["JavaScript", "Python", "Java", "C#", "React"]'
        selected='["JavaScript"]'>
    </multi-select-autocomplete>

    <multi-select-autocomplete
        id="framework-selector"
        placeholder="Select frameworks..."
        suggestions='["React", "Angular", "Vue", "Svelte"]'
        max-suggestions="5">
     </multi-select-autocomplete>
    ```

    **Important Note on Attributes:** Attributes like `suggestions` and `selected` expect **valid JSON strings** when passing array data directly in HTML. Make sure quotes within the JSON string are properly handled (e.g., use single quotes for the HTML attribute value and double quotes inside the JSON, or escape double quotes). Alternatively, set these using JavaScript properties (see below).

2.  **JavaScript Interaction:**

    * **Accessing the Component:** Get a reference to the element like any other DOM element.

        ```javascript
        // Wait for elements to be defined and DOM ready
        window.addEventListener('DOMContentLoaded', () => {
            const techSelectorElement = document.getElementById('tech-selector');
            const frameworkSelectorElement = document.getElementById('framework-selector');

            if (techSelectorElement) {
              // Now you can interact with techSelectorElement
              console.log('Initial Tech:', techSelectorElement.getSelectedItems());
            }
        });
        ```

    * **Listening to Events:** Instead of callbacks, listen for standard DOM `CustomEvent`s dispatched by the component.

        ```javascript
        techSelectorElement.addEventListener('add', (event) => {
            // event.detail contains the added item
            console.log('Tech Added:', event.detail.item);
        });

        techSelectorElement.addEventListener('remove', (event) => {
            // event.detail contains the removed item
            console.log('Tech Removed:', event.detail.item);
        });

        techSelectorElement.addEventListener('clearall', (event) => {
            // event.detail contains the array of removed items
            console.log('All Tech Cleared. Removed:', event.detail.removedItems);
        });
        ```

    * **Setting Data via Properties (Recommended for Arrays/Objects):** Instead of complex JSON strings in attributes, you can set data using JavaScript properties after getting the element reference.

        ```javascript
        const availableTech = ['JavaScript', 'Python', 'Java', 'C#', 'React'];
        const preSelectedTech = ['JavaScript'];

        // Assuming techSelectorElement is already defined
        techSelectorElement.suggestions = availableTech; // Set property directly
        techSelectorElement.selected = preSelectedTech;  // Set property directly
        ```

## Attributes and Properties

Configure the component using HTML attributes. These often correspond to JavaScript properties you can also set directly on the element instance.

| Attribute          | Property           | Type           | Default             | Description                                                                                              |
| :----------------- | :----------------- | :------------- | :------------------ | :------------------------------------------------------------------------------------------------------- |
| `placeholder`      | `placeholder`      | String         | `Type to search...` | Placeholder text for the internal input field.                                                           |
| `max-suggestions`  | `maxSuggestions`   | Number         | `10`                | Maximum number of suggestions to display in the dropdown list at once.                                   |
| `suggestions`      | `suggestions`      | JSON String    | `[]`                | **Attribute:** Valid JSON string representing the array of suggestion strings. **Property:** Array of strings. |
| `selected`         | `selected`         | JSON String    | `[]`                | **Attribute:** Valid JSON string representing the array of pre-selected items. **Property:** Array of strings. |

*(Note: It's generally easier and safer to set array data like `suggestions` and `selected` using the JavaScript **properties** rather than JSON string **attributes**.)*

## Public API Methods

Call these methods directly on the component element instance (`const myElement = document.getElementById(...)`):

* **`getSelectedItems()`**: Returns a *copy* of the array containing the strings of the currently selected items.
    ```javascript
    const currentSelection = myElement.getSelectedItems();
    console.log(currentSelection); // e.g., ['React', 'Node.js']
    ```
* **`addItem(itemText)`**: Programmatically adds an item. It checks if the item (trimmed) is already selected (case-insensitive). Returns `true` if added, `false` otherwise. Dispatches an `add` event on success.
    ```javascript
    myElement.addItem('  Vue.js  '); // Adds 'Vue.js' if not already selected
    ```
* **`removeItem(itemText)`**: Programmatically removes an item (case-insensitive comparison). Returns `true` if removed, `false` otherwise. Dispatches a `remove` event on success.
    ```javascript
    myElement.removeItem('react'); // Removes 'React' if selected
    ```
* **`clearSelection()`**: Programmatically removes all selected items. Dispatches a `clearall` event if items were removed.
    ```javascript
    myElement.clearSelection();
    ```
* **`setSuggestions(suggestionsArray)`**: Sets the available suggestions programmatically. Expects an array of strings.
    ```javascript
    myElement.setSuggestions(['Go', 'Rust', 'Zig']);
    ```
* **`setSelected(selectedArray)`**: Sets the selected items programmatically. Expects an array of strings. Overwrites the current selection.
    ```javascript
    myElement.setSelected(['Go']);
    ```

## Styling

The component encapsulates its core styles using Shadow DOM. You can customize its appearance from outside in several ways:

1.  **Style the Host Element:** Apply styles directly to the `<multi-select-autocomplete>` tag itself (e.g., for margins, width, basic layout).

    ```css
    multi-select-autocomplete {
      display: block;
      margin-bottom: 20px;
      max-width: 500px; /* Control the component's max width */
    }
    ```

2.  **CSS Shadow Parts (`::part`):** Specific internal elements have been exposed using the `part` attribute. You can target these from your page's CSS using the `::part()` pseudo-element.

    * `part="container"`: The main wrapper div inside the Shadow DOM.
    * `part="labels-container"`: The div holding the selected labels.
    * `part="selected-label"`: Each individual selected item label (`<span>`).
    * `part="remove-button"`: The 'x' button on each label (`<span>`).
    * `part="input"`: The internal text input element (`<input>`).
    * `part="clear-button"`: The 'X' button to clear all selections (`<span>`).
    * `part="suggestions-list"`: The suggestions dropdown list (`<ul>`).
    * `part="suggestion-item"`: Each individual suggestion item (`<li>`).
    * `part="add-new-item"`: The special "Add new" suggestion item (`<li>`).

    ```css
    /* Example: Change selected label background and input background */
    multi-select-autocomplete::part(selected-label) {
      background-color: darkmagenta;
      color: white;
      border-radius: 4px;
    }

    multi-select-autocomplete::part(input) {
      background-color: #eee;
      border: 1px solid #999;
    }

    multi-select-autocomplete::part(suggestions-list) {
        max-height: 150px; /* Change max dropdown height */
        border-color: blue;
    }
    ```

3.  **CSS Custom Properties (Variables):** * (If the component were designed to use them internally)* You could define CSS variables outside and the component's internal CSS could use them, allowing easy themeing. (Note: The current component code doesn't explicitly use custom properties, but `::part` is available).

## License

This project is licensed under the MIT License - see the LICENSE file for details.