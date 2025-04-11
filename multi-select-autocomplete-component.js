// multi-select-autocomplete-component.js

const template = document.createElement('template');
template.innerHTML = `
    <style>
        /* --- Paste ALL CSS from multi-select-autocomplete.css here --- */
        :host { /* Style the component element itself */
            display: block; /* Or inline-block, depending on desired layout */
            position: relative; /* Needed for absolute positioning of suggestions */
            box-sizing: border-box;
        }

        /* --- Basic Layout & Container (Applied to internal wrapper) --- */
        .autocomplete-container {
            position: relative;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 10px;
            padding-right: 30px; /* Space for clear button */
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            background-color: #fff;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            box-sizing: border-box;
            min-height: 40px; /* Matches original input height roughly */
            cursor: text; /* Indicate text input area */
        }

        /* --- Selected Labels Area --- */
        .selected-labels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            padding-right: 5px;
            box-sizing: border-box;
        }

        /* --- Individual Selected Label (Blue Style) --- */
        .selected-label {
            display: inline-flex;
            align-items: center;
            background-color: #007bff;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.9em;
            margin-right: 5px;
            margin-bottom: 5px; /* Ensures labels wrap correctly */
            white-space: nowrap;
            box-sizing: border-box;
            height: fit-content;
        }

        /* --- Remove Button ('x') on Label --- */
        .remove-label-btn {
            margin-left: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 1.1em;
            line-height: 1;
            padding: 0 3px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.2);
            transition: background-color 0.2s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .remove-label-btn:hover {
            background-color: rgba(255, 255, 255, 0.4);
        }

        /* --- Input Field (Internal) --- */
        .autocomplete-input { /* Renamed from .autocomplete-container input */
            flex-grow: 1;
            padding-top: 7px;
            padding-bottom: 7px;
            padding-left: 8px;
            padding-right: 8px;
            font-size: 1em;
            border: none;
            outline: none;
            min-width: 150px;
            align-self: center;
            box-sizing: border-box;
            margin-bottom: 5px; /* Align with labels */
            height: fit-content;
            border-radius: 3px;
            background-color: #f5f5f5; /* Light grey background */
        }

        /* Optional focus style */
        /* .autocomplete-input:focus { ... } */

        /* --- Suggestions List --- */
        .suggestions-list {
            list-style: none;
            padding: 0;
            margin: 0;
            position: absolute;
            top: calc(100% - 1px); /* Position below the container */
            left: 0;
            right: 0;
            background-color: white;
            border: 1px solid #ccc;
            border-top: none;
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            border-radius: 0 0 5px 5px;
            box-sizing: border-box;
        }

        /* --- Individual Suggestion Item --- */
        .suggestion-item {
            padding: 10px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
            box-sizing: border-box;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .suggestion-item:last-child {
            border-bottom: none;
        }

        /* --- Suggestion Item Hover/Highlight --- */
        .suggestion-item:hover,
        .suggestion-item.highlighted {
            background-color: #f0f0f0;
        }

        /* --- Add New Item Styling --- */
        .suggestion-item.add-new-item {
            font-style: italic;
            color: #0056b3;
            font-weight: bold;
        }

        .suggestion-item.add-new-item::before {
            content: "+ ";
            font-weight: bold;
            color: #28a745;
        }

        .suggestion-item.add-new-item:hover,
        .suggestion-item.add-new-item.highlighted {
            background-color: #e7f2ff;
            color: #003d80;
        }

        /* --- Clear All Button ('X') --- */
        .clear-all-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            font-size: 1.4em;
            font-weight: bold;
            color: #aaa;
            cursor: pointer;
            line-height: 1;
            padding: 2px 4px;
            border-radius: 3px;
            display: none; /* Initially hidden */
            z-index: 5;
            background-color: transparent;
            box-sizing: border-box;
        }

        .clear-all-btn:hover {
            color: #333;
            background-color: #eee;
        }

    </style>
    <div class="autocomplete-container" part="container">
        <div class="selected-labels-container" part="labels-container">
            </div>
        <input type="text" class="autocomplete-input" part="input" autocomplete="off" role="combobox" aria-expanded="false" aria-haspopup="listbox"/>
        <span class="clear-all-btn" part="clear-button" role="button" aria-label="Clear all selections" title="Clear all selections">&times;</span>
        <ul class="suggestions-list" part="suggestions-list" role="listbox">
            </ul>
    </div>
`;

class MultiSelectAutocompleteComponent extends HTMLElement {

    static componentStylesClass = 'autocomplete-container';
    static labelsClass = 'selected-labels-container';
    static labelClass = 'selected-label';
    static removeClass = 'remove-label-btn';
    static clearClass = 'clear-all-btn';
    static inputClass = 'autocomplete-input';
    static suggestionsListClass = 'suggestions-list';
    static suggestionItemClass = 'suggestion-item';
    static highlightClass = 'highlighted';
    static addNewItemClass = 'add-new-item';

    // Define attributes to observe for changes
    static get observedAttributes() {
        return ['placeholder', 'max-suggestions', 'suggestions', 'selected'];
    }

    constructor() {
        super(); // Always call super first

        // --- State and Configuration ---
        this.allSuggestionsData = [];
        this.selectedItems = [];
        this.selectedItemsSet = new Set(); // For quick lookups
        this.currentFilteredSuggestions = [];
        this.highlightedIndex = -1;
        this._maxSuggestions = 10;
        this._placeholder = 'Type to search...';

        // Attach Shadow Root
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Get references to internal elements (querying the shadow root)
        this._wrapperElement = this.shadowRoot.querySelector(`.${MultiSelectAutocompleteComponent.componentStylesClass}`);
        this._inputElement = this.shadowRoot.querySelector(`.${MultiSelectAutocompleteComponent.inputClass}`);
        this._selectedLabelsContainer = this.shadowRoot.querySelector(`.${MultiSelectAutocompleteComponent.labelsClass}`);
        this._clearAllButtonElement = this.shadowRoot.querySelector(`.${MultiSelectAutocompleteComponent.clearClass}`);
        this._suggestionsListElement = this.shadowRoot.querySelector(`.${MultiSelectAutocompleteComponent.suggestionsListClass}`);

        // Assign unique ID to list if needed for ARIA
        this._suggestionsListElement.id = `msa-suggestions-${crypto.randomUUID()}`;
        this._inputElement.setAttribute('aria-owns', this._suggestionsListElement.id);

        // Bind event handlers
        this._bindEventHandlers();
    }

    // --- Lifecycle Callbacks ---

    connectedCallback() {
        console.log('[MultiSelectAutocompleteComponent] Connected');
        this._updateConfigFromAttributes(); // Apply initial attributes
        this._addEventListeners();
        this._renderSelectedLabels(); // Render initial selection based on attributes
        this._inputElement.placeholder = this._placeholder;
    }

    disconnectedCallback() {
        console.log('[MultiSelectAutocompleteComponent] Disconnected');
        this._removeEventListeners();
        // Clear references (optional, helps GC potentially)
        this._wrapperElement = null;
        this._inputElement = null;
        // ... etc.
    }

    attributeChangedCallback(name, oldValue, newValue) {
        // console.log(`[MultiSelectAutocompleteComponent] Attribute ${name} changed from ${oldValue} to ${newValue}`);
        if (oldValue !== newValue) {
            this._updateConfigFromAttributes();
            // Potentially re-render if 'selected' or 'suggestions' changed
            if (name === 'selected' || name === 'suggestions') {
                this._renderSelectedLabels();
                this._hideSuggestions(); // Hide suggestions as data changed
            }
            if (name === 'placeholder') {
                this._inputElement.placeholder = this._placeholder;
            }
        }
    }

    // --- Configuration & Data Handling ---

    _bindEventHandlers() {
        this.boundHandleInput = this._handleInput.bind(this);
        this.boundHandleKeyDown = this._handleKeyDown.bind(this);
        this.boundHandleInputClick = this._handleInputClick.bind(this);
        this.boundHandleDocumentClick = this._handleDocumentClick.bind(this);
        this.boundHandleContainerClick = this._handleContainerClick.bind(this);
        this.boundHandleClearAllClick = this._handleClearAllClick.bind(this);
        this.boundHandleLabelContainerClick = this._handleLabelContainerClick.bind(this);
    }

    _updateConfigFromAttributes() {
        this._placeholder = this.getAttribute('placeholder') || 'Type to search...';

        const maxSuggestionsAttr = this.getAttribute('max-suggestions');
        this._maxSuggestions = maxSuggestionsAttr ? parseInt(maxSuggestionsAttr, 10) : 10;
        if (isNaN(this._maxSuggestions) || this._maxSuggestions <= 0) {
            this._maxSuggestions = 10;
        }

        // Parse JSON attributes safely
        try {
            const suggestionsAttr = this.getAttribute('suggestions');
            this.allSuggestionsData = suggestionsAttr ? this._processStringArray(JSON.parse(suggestionsAttr)) : [];
        } catch (e) {
            console.error('[MultiSelectAutocompleteComponent] Failed to parse "suggestions" attribute JSON.', e);
            this.allSuggestionsData = [];
        }

        try {
            const selectedAttr = this.getAttribute('selected');
            // Only update selected if attribute exists, otherwise keep current state
            if (selectedAttr !== null) {
                this.selectedItems = this._processStringArray(JSON.parse(selectedAttr));
                this.selectedItemsSet = new Set(this.selectedItems.map(item => item.toLowerCase()));
                // Re-render might be needed here or handled by attributeChangedCallback
            }
        } catch (e) {
            console.error('[MultiSelectAutocompleteComponent] Failed to parse "selected" attribute JSON.', e);
            // Don't reset selected items on parse error if already populated
            if (!this.selectedItems) {
                this.selectedItems = [];
                this.selectedItemsSet = new Set();
            }
        }
        // console.log('[MultiSelectAutocompleteComponent] Config Updated:', { placeholder: this._placeholder, max: this._maxSuggestions, suggestions: this.allSuggestionsData.length, selected: this.selectedItems.length });
    }

    _processStringArray(arr) {
        if (!Array.isArray(arr)) return [];
        return [...new Set(arr
            .filter(s => typeof s === 'string')
            .map(s => s.trim())
            .filter(s => s.length > 0)
        )];
    }


    // --- Event Listener Management ---

    _addEventListeners() {
        this._inputElement.addEventListener('input', this.boundHandleInput);
        this._inputElement.addEventListener('keydown', this.boundHandleKeyDown);
        this._inputElement.addEventListener('click', this.boundHandleInputClick);
        this._selectedLabelsContainer.addEventListener('click', this.boundHandleLabelContainerClick);
        this._clearAllButtonElement.addEventListener('click', this.boundHandleClearAllClick);
        this._wrapperElement.addEventListener('click', this.boundHandleContainerClick);
        // Listen on document to close suggestions when clicking outside
        document.addEventListener('click', this.boundHandleDocumentClick, true); // Use capture to potentially catch clicks earlier
    }

    _removeEventListeners() {
        this._inputElement?.removeEventListener('input', this.boundHandleInput);
        this._inputElement?.removeEventListener('keydown', this.boundHandleKeyDown);
        this._inputElement?.removeEventListener('click', this.boundHandleInputClick);
        this._selectedLabelsContainer?.removeEventListener('click', this.boundHandleLabelContainerClick);
        this._clearAllButtonElement?.removeEventListener('click', this.boundHandleClearAllClick);
        this._wrapperElement?.removeEventListener('click', this.boundHandleContainerClick);
        document.removeEventListener('click', this.boundHandleDocumentClick, true);
    }

    // --- Event Handlers (Adapted from original class) ---

    _handleInput() {
        this._displaySuggestions();
    }

    _handleKeyDown(e) {
        const isListVisible = this._suggestionsListElement.style.display === 'block';
        const listItems = isListVisible ? this._suggestionsListElement.querySelectorAll(`.${MultiSelectAutocompleteComponent.suggestionItemClass}`) : [];
        const numSuggestions = listItems.length;
        let preventDefault = false;

        switch (e.key) {
            case 'ArrowDown':
                preventDefault = true;
                if (!isListVisible && this._inputElement.value.trim().length > 0) {
                    this._displaySuggestions();
                } else if (isListVisible && numSuggestions > 0) {
                    this.highlightedIndex = (this.highlightedIndex + 1) % numSuggestions;
                    this._updateHighlight();
                }
                break;
            case 'ArrowUp':
                preventDefault = true;
                if (isListVisible && numSuggestions > 0) {
                    this.highlightedIndex = (this.highlightedIndex - 1 + numSuggestions) % numSuggestions;
                    this._updateHighlight();
                }
                break;
            case ' ': // Spacebar
                if (isListVisible && this.highlightedIndex > -1 && numSuggestions > 0) {
                    preventDefault = true;
                    const highlightedLi = listItems[this.highlightedIndex];
                    if (highlightedLi) {
                        const valueToAdd = highlightedLi.dataset.addNewValue || highlightedLi.textContent;
                        if (valueToAdd) this.addItem(valueToAdd);
                    }
                }
                break;
            case 'Enter':
                preventDefault = true;
                let valueToAddEnter = null;
                if (isListVisible && this.highlightedIndex > -1 && listItems[this.highlightedIndex]) {
                    const highlightedLi = listItems[this.highlightedIndex];
                    valueToAddEnter = highlightedLi.dataset.addNewValue || highlightedLi.textContent;
                } else {
                    const rawInputValue = this._inputElement.value.trim();
                    if (rawInputValue.length > 0) valueToAddEnter = rawInputValue;
                }
                if (valueToAddEnter) this.addItem(valueToAddEnter);
                this._inputElement.value = '';
                this._hideSuggestions();
                break;
            case 'Escape':
                if (isListVisible) {
                    preventDefault = true;
                    this._hideSuggestions();
                }
                break;
            default:
                if (isListVisible) {
                    this.highlightedIndex = -1;
                    this._updateHighlight(false);
                }
                break;
        }
        if (preventDefault) e.preventDefault();
    }

    _handleInputClick(e) {
        e.stopPropagation();
        if (this._inputElement.value.trim().length > 0 && this._suggestionsListElement.style.display === 'none') {
            this._displaySuggestions();
        }
    }

    _handleLabelContainerClick(e) {
        if (e.target.classList.contains(MultiSelectAutocompleteComponent.removeClass)) {
            e.stopPropagation();
            const labelElement = e.target.closest('.' + MultiSelectAutocompleteComponent.labelClass);
            const itemToRemove = labelElement?.dataset.value;
            if (itemToRemove) {
                this.removeItem(itemToRemove);
                this._inputElement.focus();
            }
        }
    }

    _handleClearAllClick(e) {
        e.stopPropagation();
        this.clearSelection();
        this._inputElement.focus();
    }

    _handleContainerClick(e) {
        const target = e.target;
        // Focus input only if clicking non-interactive background
        if ((target === this._wrapperElement || target === this._selectedLabelsContainer) &&
            !target.closest('.' + MultiSelectAutocompleteComponent.removeClass) &&
            target !== this._clearAllButtonElement &&
            target !== this._inputElement &&
            !target.closest('.' + MultiSelectAutocompleteComponent.suggestionItemClass)) {
            this._inputElement.focus();
        }
    }

    _handleDocumentClick(e) {
        // Check if the click is outside the component host element
        if (!this.contains(e.target)) {
            this._hideSuggestions();
        }
    }

    // --- Core Logic Methods (Adapted) ---

    _renderSelectedLabels() {
        const fragment = document.createDocumentFragment();
        this.selectedItems.forEach(item => {
            const labelSpan = document.createElement('span');
            labelSpan.className = MultiSelectAutocompleteComponent.labelClass;
            labelSpan.textContent = item;
            labelSpan.dataset.value = item;
            labelSpan.setAttribute('part', 'selected-label'); // Expose part for styling

            const removeBtn = document.createElement('span');
            removeBtn.className = MultiSelectAutocompleteComponent.removeClass;
            removeBtn.innerHTML = '&times;';
            removeBtn.title = `Remove ${item}`;
            removeBtn.setAttribute('role', 'button');
            removeBtn.setAttribute('aria-label', `Remove ${item}`);
            removeBtn.setAttribute('part', 'remove-button'); // Expose part
            removeBtn.tabIndex = -1;

            labelSpan.appendChild(removeBtn);
            fragment.appendChild(labelSpan);
        });

        this._selectedLabelsContainer.innerHTML = '';
        this._selectedLabelsContainer.appendChild(fragment);
        this._clearAllButtonElement.style.display = this.selectedItems.length > 0 ? 'inline-block' : 'none';
    }

    _displaySuggestions() {
        const rawInputValue = this._inputElement.value.trim();
        const lowerInputValue = rawInputValue.toLowerCase();

        this._suggestionsListElement.innerHTML = '';
        this.currentFilteredSuggestions = [];

        if (lowerInputValue.length === 0) {
            this._hideSuggestions();
            return;
        }

        this.currentFilteredSuggestions = this.allSuggestionsData.filter(suggestion =>
            !this.selectedItemsSet.has(suggestion.toLowerCase()) &&
            suggestion.toLowerCase().includes(lowerInputValue)
        );

        let canAddNew = false;
        if (rawInputValue.length > 0) {
            const isExactMatchSuggestion = this.allSuggestionsData.some(s => s.toLowerCase() === lowerInputValue);
            const isAlreadySelected = this.selectedItemsSet.has(lowerInputValue);
            canAddNew = !isExactMatchSuggestion && !isAlreadySelected;
        }

        const fragment = document.createDocumentFragment();

        if (canAddNew) {
            const addNewLi = this._createSuggestionLi(
                `Add "${rawInputValue}"`,
                `${MultiSelectAutocompleteComponent.suggestionItemClass} ${MultiSelectAutocompleteComponent.addNewItemClass}`,
                `${this._suggestionsListElement.id}-addnew`
            );
            addNewLi.dataset.addNewValue = rawInputValue;
            addNewLi.setAttribute('part', 'suggestion-item add-new-item');
            addNewLi.addEventListener('click', (e) => { e.stopPropagation(); this.addItem(rawInputValue); });
            fragment.appendChild(addNewLi);
        }

        this.currentFilteredSuggestions
            .slice(0, this._maxSuggestions)
            .forEach((suggestion, index) => {
                const listItem = this._createSuggestionLi(
                    suggestion,
                    MultiSelectAutocompleteComponent.suggestionItemClass,
                    `${this._suggestionsListElement.id}-item-${index}`
                );
                listItem.setAttribute('part', 'suggestion-item');
                listItem.addEventListener('click', (e) => { e.stopPropagation(); this.addItem(suggestion); });
                fragment.appendChild(listItem);
            });

        if (fragment.hasChildNodes()) {
            this._suggestionsListElement.appendChild(fragment);
            this.highlightedIndex = -1;
            this._updateHighlight(false);
            this._suggestionsListElement.style.display = 'block';
            this._inputElement.setAttribute('aria-expanded', 'true');
        } else {
            this._hideSuggestions();
        }
    }

    _createSuggestionLi(textContent, className, id) {
        const listItem = document.createElement('li');
        listItem.className = className;
        listItem.textContent = textContent;
        listItem.setAttribute('role', 'option');
        listItem.id = id;
        return listItem;
    }

    _hideSuggestions() {
        if (this._suggestionsListElement.style.display !== 'none') {
            this._suggestionsListElement.style.display = 'none';
            this._inputElement.setAttribute('aria-expanded', 'false');
            this._inputElement.removeAttribute('aria-activedescendant');
            this.highlightedIndex = -1;
        }
    }

    _updateHighlight(shouldScroll = true) {
        const listItems = this._suggestionsListElement.querySelectorAll(`.${MultiSelectAutocompleteComponent.suggestionItemClass}`);
        let activeDescendantId = null;

        listItems.forEach((item, index) => {
            const shouldHighlight = index === this.highlightedIndex;
            item.classList.toggle(MultiSelectAutocompleteComponent.highlightClass, shouldHighlight);
            if (shouldHighlight) {
                item.setAttribute('aria-selected', 'true');
                activeDescendantId = item.id;
                if (shouldScroll) item.scrollIntoView({ block: 'nearest' });
            } else {
                item.removeAttribute('aria-selected');
            }
        });

        if (activeDescendantId) {
            this._inputElement.setAttribute('aria-activedescendant', activeDescendantId);
        } else {
            this._inputElement.removeAttribute('aria-activedescendant');
        }
    }

    // --- Public API Methods ---

    /**
     * Adds an item to the selection.
     * @param {string} itemText - The text of the item to add.
     * @returns {boolean} - True if the item was added, false otherwise.
     */
    addItem(itemText) {
        const trimmedItemText = itemText?.trim();
        if (!trimmedItemText) return false;

        const lowerTrimmedItemText = trimmedItemText.toLowerCase();
        if (!this.selectedItemsSet.has(lowerTrimmedItemText)) {
            this.selectedItems.push(trimmedItemText);
            this.selectedItemsSet.add(lowerTrimmedItemText);
            this._renderSelectedLabels();
            this._displaySuggestions(); // Refresh suggestions

            // Dispatch custom event
            this.dispatchEvent(new CustomEvent('add', {
                bubbles: true, // Allow event to bubble up
                composed: true, // Allow event to cross Shadow DOM boundary
                detail: { item: trimmedItemText }
            }));

            this._inputElement.focus(); // Keep focus
            return true;
        }
        this._inputElement.focus();
        return false;
    }

    /**
     * Removes an item from the selection.
     * @param {string} itemText - The text of the item to remove.
     * @returns {boolean} - True if the item was removed, false otherwise.
     */
    removeItem(itemText) {
        if (!itemText) return false;
        const lowerItemText = itemText.toLowerCase();

        if (this.selectedItemsSet.has(lowerItemText)) {
            this.selectedItems = this.selectedItems.filter(item => item.toLowerCase() !== lowerItemText);
            this.selectedItemsSet.delete(lowerItemText);
            this._renderSelectedLabels();
            this._displaySuggestions(); // Refresh suggestions

            // Dispatch custom event
            this.dispatchEvent(new CustomEvent('remove', {
                bubbles: true,
                composed: true,
                detail: { item: itemText }
            }));

            return true;
        }
        return false;
    }

    /**
     * Clears all selected items.
     */
    clearSelection() {
        if (this.selectedItems.length === 0) return;
        const removedItems = [...this.selectedItems]; // Copy for event detail

        this.selectedItems = [];
        this.selectedItemsSet.clear();
        this._renderSelectedLabels();
        this._displaySuggestions(); // Refresh suggestions

        // Dispatch custom event
        this.dispatchEvent(new CustomEvent('clearall', {
            bubbles: true,
            composed: true,
            detail: { removedItems: removedItems }
        }));
    }

    /**
     * Gets the currently selected items.
     * @returns {string[]} A copy of the selected items array.
     */
    getSelectedItems() {
        return [...this.selectedItems]; // Return a defensive copy
    }

    /**
     * Sets the available suggestions.
     * @param {string[]} suggestionsArray - An array of suggestion strings.
     */
    setSuggestions(suggestionsArray) {
        this.allSuggestionsData = this._processStringArray(suggestionsArray);
        this._displaySuggestions(); // Update display if needed
    }

    /**
     * Sets the selected items.
     * @param {string[]} selectedArray - An array of items to select.
     */
    setSelected(selectedArray) {
        this.selectedItems = this._processStringArray(selectedArray);
        this.selectedItemsSet = new Set(this.selectedItems.map(item => item.toLowerCase()));
        this._renderSelectedLabels();
        this._displaySuggestions(); // Update display if needed
    }
}

// Define the Custom Element
if (!window.customElements.get('multi-select-autocomplete')) {
    window.customElements.define('multi-select-autocomplete', MultiSelectAutocompleteComponent);
}