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
        return ['placeholder', 'max-suggestions', 'suggestions', 'selected', 'tag-server', 'tag-group'];
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
        this._tagServer = null;
        this._tagGroup = null;
        this._initialFetchDone = false; // Flag to prevent multiple initial fetches

        // Attach Shadow Root
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Get references to internal elements
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

        // Perform initial fetch if configured and not already done
        if (!this._initialFetchDone) {
             this._fetchInitialTags(); // Call the initial fetch
        }
    }

    disconnectedCallback() {
        console.log('[MultiSelectAutocompleteComponent] Disconnected');
        this._removeEventListeners();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            const oldTagServer = this._tagServer;
            const oldTagGroup = this._tagGroup;

            this._updateConfigFromAttributes();

            let needsReRender = false;
            let needsRefetch = false;

            if (name === 'selected') {
                // Only re-parse 'selected' if it wasn't the source of the change (e.g., from initial fetch)
                 if (!this._isServerConfigured() || !this._initialFetchDone) {
                     this._parseSelectedAttribute(newValue);
                     needsReRender = true;
                 }
            } else if (name === 'suggestions') {
                 this._parseSuggestionsAttribute(newValue);
                 // Suggestions changing might require filtering again if list is open
                 if (this._suggestionsListElement.style.display === 'block') {
                    this._displaySuggestions();
                 }
            } else if (name === 'placeholder') {
                this._inputElement.placeholder = this._placeholder;
            } else if (name === 'tag-server' || name === 'tag-group') {
                // If server config changes, trigger a refetch
                 if (this._tagServer !== oldTagServer || this._tagGroup !== oldTagGroup) {
                    needsRefetch = true;
                }
            }

            if (needsReRender) {
                this._renderSelectedLabels();
                // If list is open, refresh it after selection change
                if (this._suggestionsListElement.style.display === 'block') {
                   this._displaySuggestions();
                }
            }

            if (needsRefetch && this.isConnected) { // Check if connected before fetching
                console.log('[MultiSelectAutocompleteComponent] Server config changed, re-fetching initial tags.');
                 this._initialFetchDone = false; // Allow re-fetch
                 this._fetchInitialTags(); // Refetch if server/group changes
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
        this._tagServer = this.getAttribute('tag-server');
        this._tagGroup = this.getAttribute('tag-group');

        const maxSuggestionsAttr = this.getAttribute('max-suggestions');
        this._maxSuggestions = maxSuggestionsAttr ? parseInt(maxSuggestionsAttr, 10) : 10;
        if (isNaN(this._maxSuggestions) || this._maxSuggestions <= 0) {
            this._maxSuggestions = 10;
        }

        // Parse JSON attributes safely only if server isn't configured or initial fetch hasn't happened
        if (!this._isServerConfigured() || !this._initialFetchDone) {
             if (this.hasAttribute('suggestions')) {
                 this._parseSuggestionsAttribute(this.getAttribute('suggestions'));
             }
        }
        if (this.hasAttribute('selected')) {
            this._parseSelectedAttribute(this.getAttribute('selected'));
        }
    }

     _parseSuggestionsAttribute(suggestionsAttr) {
        try {
            this.allSuggestionsData = suggestionsAttr ? this._processStringArray(JSON.parse(suggestionsAttr)) : [];
        } catch (e) {
            console.error('[MultiSelectAutocompleteComponent] Failed to parse "suggestions" attribute JSON.', e);
            this.allSuggestionsData = [];
        }
    }

    _parseSelectedAttribute(selectedAttr) {
         try {
            if (selectedAttr !== null) {
                this.selectedItems = this._processStringArray(JSON.parse(selectedAttr));
                this.selectedItemsSet = new Set(this.selectedItems.map(item => item.toLowerCase()));
            }
        } catch (e) {
            console.error('[MultiSelectAutocompleteComponent] Failed to parse "selected" attribute JSON.', e);
            if (!this.selectedItems) {
                this.selectedItems = [];
                this.selectedItemsSet = new Set();
            }
        }
    }

    _processStringArray(arr) {
        if (!Array.isArray(arr)) return [];
        const seen = new Set();
        return arr
            .map(s => typeof s === 'string' ? s.trim() : '')
            .filter(s => s.length > 0)
            .filter(s => {
                const lower = s.toLowerCase();
                if (seen.has(lower)) {
                    return false;
                }
                seen.add(lower);
                return true;
            });
    }

    // --- Event Listener Management ---

    _addEventListeners() {
        this._inputElement.addEventListener('input', this.boundHandleInput);
        this._inputElement.addEventListener('keydown', this.boundHandleKeyDown); // Uses the LATEST _handleKeyDown
        this._inputElement.addEventListener('click', this.boundHandleInputClick);
        this._selectedLabelsContainer.addEventListener('click', this.boundHandleLabelContainerClick);
        this._clearAllButtonElement.addEventListener('click', this.boundHandleClearAllClick);
        this._wrapperElement.addEventListener('click', this.boundHandleContainerClick);
        document.addEventListener('click', this.boundHandleDocumentClick, true); // Use capture phase
    }

    _removeEventListeners() {
        this._inputElement?.removeEventListener('input', this.boundHandleInput);
        this._inputElement?.removeEventListener('keydown', this.boundHandleKeyDown);
        this._inputElement?.removeEventListener('click', this.boundHandleInputClick);
        this._selectedLabelsContainer?.removeEventListener('click', this.boundHandleLabelContainerClick);
        this._clearAllButtonElement?.removeEventListener('click', this.boundHandleClearAllClick);
        this._wrapperElement?.removeEventListener('click', this.boundHandleContainerClick);
        document.removeEventListener('click', this.boundHandleDocumentClick, true); // Use capture phase
    }

    // --- Event Handlers (Updated based on Response #8) ---

    _handleInput() {
        const value = this._inputElement.value.trim();
        // Display suggestions only if user is typing something
        if (value.length > 0) {
            this.highlightedIndex = -1; // Reset highlight when typing starts
            this._displaySuggestions();
        } else {
            // Hide suggestions if user deletes all text
            this._hideSuggestions();
        }
    }

    _handleInputClick(e) {
        // Only show suggestions on click if there IS text in the input
        // (mimicking the "only show when typing" behavior)
        if (this._inputElement.value.trim().length > 0) {
             this._displaySuggestions();
        }
        // If you want click on empty input to show all, uncomment the line below
        // else { this._displaySuggestions(); }
        e.stopPropagation();
    }

    _handleLabelContainerClick(e) {
        // Handle clicks on remove buttons within labels
        if (e.target.classList.contains(MultiSelectAutocompleteComponent.removeClass)) {
            e.stopPropagation(); // Prevent container click focusing input unnecessarily
            const labelSpan = e.target.closest(`.${MultiSelectAutocompleteComponent.labelClass}`);
            if (labelSpan && labelSpan.dataset.value) {
                const removed = this.removeItem(labelSpan.dataset.value); // Doesn't call displaySuggestions
                if(removed) {
                    // Manually refresh list after removal via click
                    this._displaySuggestions();
                    this._inputElement.focus(); // Keep focus in the component
                }
            }
        }
        // Handle clicks directly on the container (not on a label/button) to focus input
        else if (e.target === this._selectedLabelsContainer || e.target === this._wrapperElement) {
             this._inputElement.focus();
        }
    }

    _handleClearAllClick(e) {
        e.stopPropagation(); // Prevent container click
        this.clearSelection(); // Calls _displaySuggestions internally now
        this._inputElement.focus();
    }

    _handleContainerClick(e) {
        // If the click is directly on the container background (not input/labels/suggestions), focus the input
        if (e.target === this._wrapperElement) {
            this._inputElement.focus();
        }
        // Don't propagate further up if click was inside the component unless handled above
        e.stopPropagation();
    }

    _handleDocumentClick(e) {
        // Hide suggestions if the click is outside the component's shadow root AND the host element itself
        if (!this.shadowRoot.contains(e.target) && !this.contains(e.target)) {
           this._hideSuggestions();
        }
    }

    // --- LATEST UPDATED _handleKeyDown Method (Refactored Visibility Control) ---
    _handleKeyDown(e) {
        const isListVisible = this._suggestionsListElement.style.display === 'block';
        const listItems = isListVisible ? this._suggestionsListElement.querySelectorAll(`.${MultiSelectAutocompleteComponent.suggestionItemClass}`) : [];
        const numSuggestions = listItems.length;
        let preventDefault = false;

        switch (e.key) {
            case 'ArrowDown':
                 preventDefault = true;
                 if (!isListVisible && this._inputElement.value.trim().length > 0) {
                     // If list not visible but there's text, show it and highlight first
                     this.highlightedIndex = -1; // Ensure we start from top
                     this._displaySuggestions(); // Show the list first
                     // Check if list actually appeared and has items before highlighting
                     const newItems = this._suggestionsListElement.querySelectorAll(`.${MultiSelectAutocompleteComponent.suggestionItemClass}`);
                     if (newItems.length > 0) {
                        this.highlightedIndex = 0;
                        this._updateHighlight();
                     }
                 } else if (isListVisible && numSuggestions > 0) {
                     // List is visible, move highlight down
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

            case ' ': // Spacebar (Keep list open)
                if (isListVisible && this.highlightedIndex > -1 && numSuggestions > 0) {
                    preventDefault = true;
                    const highlightedLi = listItems[this.highlightedIndex];
                    if (highlightedLi) {
                        const valueToAdd = highlightedLi.dataset.addNewValue || highlightedLi.textContent;
                        if (valueToAdd) {
                             const added = this.addItem(valueToAdd); // Doesn't call display itself
                             if (added) {
                                 this._inputElement.value = ''; // Clear input
                                 this.highlightedIndex = -1; // Reset highlight after selection
                                 // *** Manually refresh list content; it will show remaining items ***
                                 this._displaySuggestions();
                             }
                             this._inputElement.focus();
                        }
                    }
                } else {
                    preventDefault = false; // Allow space typing
                }
                break;

            case 'Enter': // Enter (Select and close list)
                preventDefault = true;
                let valueToAddEnter = null;
                if (isListVisible && this.highlightedIndex > -1 && listItems[this.highlightedIndex]) {
                    // If item highlighted, take it
                    const highlightedLi = listItems[this.highlightedIndex];
                    valueToAddEnter = highlightedLi.dataset.addNewValue || highlightedLi.textContent;
                } else {
                    // If no highlight, try adding typed text if valid
                    const rawInputValue = this._inputElement.value.trim();
                    if (rawInputValue.length > 0) {
                         const isExactMatchSuggestion = this.allSuggestionsData.some(s => s.toLowerCase() === rawInputValue.toLowerCase());
                         const isAlreadySelected = this.selectedItemsSet.has(rawInputValue.toLowerCase());
                         if (!isExactMatchSuggestion && !isAlreadySelected) {
                             valueToAddEnter = rawInputValue; // Allow adding typed text
                         }
                    }
                }

                if (valueToAddEnter) {
                    this.addItem(valueToAddEnter); // Doesn't call display itself
                }
                this._inputElement.value = '';
                // *** Explicitly hide list on Enter ***
                this._hideSuggestions();
                break;

            case 'Escape':
                if (isListVisible) {
                    preventDefault = true;
                    this._hideSuggestions(); // Escape closes the list
                }
                break;

            case 'Backspace':
                if (this._inputElement.value === '' && this.selectedItems.length > 0) {
                    // Remove last item if input is empty
                    preventDefault = true;
                    const lastItem = this.selectedItems[this.selectedItems.length - 1];
                    const removed = this.removeItem(lastItem); // Doesn't call display itself
                    if (removed) {
                         // *** Manually refresh list content after removal ***
                         this._displaySuggestions(); // Show remaining items
                    }
                } else {
                    // If typing backspace, let the 'input' event handle hiding/showing suggestions
                    this.highlightedIndex = -1; // Reset highlight
                     if(isListVisible) this._updateHighlight(false); // Update ARIA if list was visible
                }
                break;

            default: // Other typing characters
                 this.highlightedIndex = -1; // Reset highlight
                 if(isListVisible) this._updateHighlight(false); // Update ARIA if list was visible
                // Let 'input' event handle showing suggestions based on new value
                break;
        }

        if (preventDefault) {
            e.preventDefault();
        }
    }
    // --- END LATEST UPDATED _handleKeyDown Method ---


    // --- Core Logic Methods ---

    _renderSelectedLabels() {
        const fragment = document.createDocumentFragment();
        this.selectedItems.forEach(item => {
            const labelSpan = document.createElement('span');
            labelSpan.className = MultiSelectAutocompleteComponent.labelClass;
            labelSpan.textContent = item;
            labelSpan.dataset.value = item;
            labelSpan.setAttribute('part', 'selected-label');

            const removeBtn = document.createElement('span');
            removeBtn.className = MultiSelectAutocompleteComponent.removeClass;
            removeBtn.innerHTML = '&times;';
            removeBtn.title = `Remove ${item}`;
            removeBtn.setAttribute('role', 'button');
            removeBtn.setAttribute('aria-label', `Remove ${item}`);
            removeBtn.setAttribute('part', 'remove-button');
            removeBtn.tabIndex = -1;

            labelSpan.appendChild(removeBtn);
            fragment.appendChild(labelSpan);
        });

        this._selectedLabelsContainer.innerHTML = '';
        this._selectedLabelsContainer.appendChild(fragment);
        this._clearAllButtonElement.style.display = this.selectedItems.length > 0 ? 'inline-block' : 'none';
    }

    // --- Method responsible for RENDERING suggestions based on current input (Updated based on Response #8) ---
    _displaySuggestions() {
        const rawInputValue = this._inputElement.value.trim();
        const lowerInputValue = rawInputValue.toLowerCase();

        this._suggestionsListElement.innerHTML = ''; // Clear previous suggestions
        this.currentFilteredSuggestions = []; // Reset filtered list

        // --- Filter Logic ---
        if (lowerInputValue.length > 0) {
            // Input has text: Filter suggestions based on input
            this.currentFilteredSuggestions = this.allSuggestionsData.filter(suggestion =>
                !this.selectedItemsSet.has(suggestion.toLowerCase()) &&
                suggestion.toLowerCase().includes(lowerInputValue)
            );
        } else {
            // Input is empty: Show all available (non-selected) suggestions
            this.currentFilteredSuggestions = this.allSuggestionsData.filter(
                suggestion => !this.selectedItemsSet.has(suggestion.toLowerCase())
            );
        }
        // --- End Filter Logic ---

        const fragment = document.createDocumentFragment();

        // Determine if the exact input can be added (only possible if input is not empty)
        let canAddNew = false;
        if (rawInputValue.length > 0) { // Only check if input has text
            const isExactMatchSuggestion = this.allSuggestionsData.some(s => s.toLowerCase() === lowerInputValue);
            const isAlreadySelected = this.selectedItemsSet.has(lowerInputValue);
            canAddNew = !isExactMatchSuggestion && !isAlreadySelected;
        }

        // Option to add the current input value if it's new
        if (canAddNew) { // This condition implies rawInputValue.length > 0
            const addNewLi = this._createSuggestionLi(
                `Add "${rawInputValue}"`,
                `${MultiSelectAutocompleteComponent.suggestionItemClass} ${MultiSelectAutocompleteComponent.addNewItemClass}`,
                `${this._suggestionsListElement.id}-addnew`
            );
            addNewLi.dataset.addNewValue = rawInputValue;
            addNewLi.setAttribute('part', 'suggestion-item add-new-item');
            addNewLi.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addItem(rawInputValue); // Doesn't call display itself
                this._inputElement.value = '';
                this._hideSuggestions(); // Click action always closes list
            });
            fragment.appendChild(addNewLi);
        }

        // Add filtered suggestions
        this.currentFilteredSuggestions
            .slice(0, this._maxSuggestions) // Apply max suggestions limit
            .forEach((suggestion, index) => {
                const listItem = this._createSuggestionLi(
                    suggestion,
                    MultiSelectAutocompleteComponent.suggestionItemClass,
                    `${this._suggestionsListElement.id}-item-${index}`
                );
                listItem.setAttribute('part', 'suggestion-item');
                listItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.addItem(suggestion); // Doesn't call display itself
                    this._inputElement.value = '';
                    this._hideSuggestions(); // Click action always closes list
                });
                fragment.appendChild(listItem);
            });

        // Show or hide the list based on whether there are any suggestions to display
        if (fragment.hasChildNodes()) {
            this._suggestionsListElement.appendChild(fragment);
             // Reset or maintain highlight
             if(this.highlightedIndex < 0) {
                this._updateHighlight(false);
             } else {
                 const currentListItems = this._suggestionsListElement.querySelectorAll(`.${MultiSelectAutocompleteComponent.suggestionItemClass}`);
                 this.highlightedIndex = Math.min(this.highlightedIndex, currentListItems.length - 1); // Clamp index
                 if (this.highlightedIndex < 0) this.highlightedIndex = -1; // Ensure it's not negative if list empty after filter
                 this._updateHighlight(false); // Update highlight visuals and ARIA
             }
            // *** SHOW the list ***
            this._suggestionsListElement.style.display = 'block';
            this._inputElement.setAttribute('aria-expanded', 'true');
        } else {
            // *** No suggestions matching criteria, HIDE the list ***
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
            this.highlightedIndex = -1; // Reset index when hiding
        }
    }

    _updateHighlight(shouldScroll = true) {
        const listItems = this._suggestionsListElement.querySelectorAll(`.${MultiSelectAutocompleteComponent.suggestionItemClass}`);
        let activeDescendantId = null;

        listItems.forEach((item, index) => {
            const shouldHighlight = index === this.highlightedIndex;
            item.classList.toggle(MultiSelectAutocompleteComponent.highlightClass, shouldHighlight);
            item.setAttribute('aria-selected', shouldHighlight ? 'true' : 'false');

            if (shouldHighlight) {
                activeDescendantId = item.id;
                if (shouldScroll) {
                     requestAnimationFrame(() => { // Use rAF for smoother scroll
                        if(item.offsetParent !== null) {
                            item.scrollIntoView({ block: 'nearest' });
                        }
                     });
                }
            }
        });

        if (activeDescendantId) {
            this._inputElement.setAttribute('aria-activedescendant', activeDescendantId);
        } else {
            this._inputElement.removeAttribute('aria-activedescendant');
        }
    }

    // --- Server Interaction Methods ---

    _isServerConfigured() {
        return !!(this._tagServer && this._tagGroup);
    }

    async _fetchInitialTags() {
        if (!this._isServerConfigured()) {
            console.log('[MultiSelectAutocompleteComponent] Server not configured, skipping initial fetch.');
            this._initialFetchDone = true;
            return;
        }

        const url = `${this._tagServer}/${this._tagGroup}`;
        console.log(`[MultiSelectAutocompleteComponent] Fetching tag choices from: ${url}`);

        try {
            const response = await fetch(url, {
                 method: 'GET',
                 headers: { 'Accept': 'application/json, text/plain' }
             });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);

            const contentType = response.headers.get('content-type');
            let fetchedTags = [];

            if (contentType && contentType.includes('application/json')) {
                 const data = await response.json();
                 fetchedTags = Array.isArray(data) ? this._processStringArray(data) : [];
                 if (!Array.isArray(data)) console.warn('[MultiSelectAutocompleteComponent] Received JSON is not an array.');
            } else {
                 const text = await response.text();
                 fetchedTags = this._processStringArray(text.split('\n'));
            }

            console.log(`[MultiSelectAutocompleteComponent] Fetched ${fetchedTags.length} tag choices.`);
            this.allSuggestionsData = [...fetchedTags];
            this._initialFetchDone = true;

        } catch (error) {
            console.error('[MultiSelectAutocompleteComponent] Failed to fetch tag choices:', error);
            this._initialFetchDone = true; // Mark done even on error
        } finally {
             this._hideSuggestions(); // Ensure hidden after fetch attempt
        }
    }

    async _syncAllTagsToServer() {
        if (!this._isServerConfigured()) {
            console.warn("[MultiSelectAutocompleteComponent] Attempted to sync tags, but server is not configured.");
            return;
        }
        const url = `${this._tagServer}/${this._tagGroup}`;
        const tagsToSync = [...this.selectedItems];
        console.log(`[MultiSelectAutocompleteComponent] Syncing ${tagsToSync.length} tags to ${url}...`);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tagsToSync),
            });
            if (response.ok) {
                console.log(`[MultiSelectAutocompleteComponent] Successfully synced tags for group '${this._tagGroup}'.`);
            } else {
                let errorText = response.statusText;
                try { errorText += ` - ${await response.text()}`; } catch (_) { /* Ignore */ }
                 console.error(`[MultiSelectAutocompleteComponent] Error syncing tags for group '${this._tagGroup}'. Status: ${response.status}. ${errorText}`);
            }
        } catch (error) {
            console.error(`[MultiSelectAutocompleteComponent] Network error syncing tags for group '${this._tagGroup}':`, error);
        }
    }

    // --- Public API Methods (Updated based on Response #8) ---

    addItem(itemText) {
        const trimmedItemText = itemText?.trim();
        if (!trimmedItemText) return false;

        const lowerTrimmedItemText = trimmedItemText.toLowerCase();
        if (!this.selectedItemsSet.has(lowerTrimmedItemText)) {
            this.selectedItems.push(trimmedItemText);
            this.selectedItemsSet.add(lowerTrimmedItemText);

            const lowerAllSuggestions = new Set(this.allSuggestionsData.map(s => s.toLowerCase()));
            if (!lowerAllSuggestions.has(lowerTrimmedItemText)) {
                 this.allSuggestionsData.push(trimmedItemText);
            }

            this._renderSelectedLabels();
            // *** REMOVED: this._displaySuggestions(); *** Calling context handles refresh

            this.dispatchEvent(new CustomEvent('add', {
                bubbles: true, composed: true, detail: { item: trimmedItemText }
            }));
            return true; // Indicate item was added
        }
        return false; // Indicate item was *not* added
    }

    removeItem(itemText) {
         if (!itemText) return false;
        const lowerItemText = itemText.toLowerCase();

        if (this.selectedItemsSet.has(lowerItemText)) {
            const originalItem = this.selectedItems.find(item => item.toLowerCase() === lowerItemText);
            this.selectedItems = this.selectedItems.filter(item => item.toLowerCase() !== lowerItemText);
            this.selectedItemsSet.delete(lowerItemText);
            this._renderSelectedLabels();
             // *** REMOVED: this._displaySuggestions(); *** Calling context handles refresh

            this.dispatchEvent(new CustomEvent('remove', {
                bubbles: true, composed: true, detail: { item: originalItem || itemText }
            }));
            return true;
        }
        return false;
    }

    clearSelection() {
        if (this.selectedItems.length === 0) return;
        const removedItems = [...this.selectedItems];

        this.selectedItems = [];
        this.selectedItemsSet.clear();
        this._renderSelectedLabels();
        // *** Manually refresh/hide list after clearing ***
        this._displaySuggestions(); // Will likely hide as input is probably empty

        this.dispatchEvent(new CustomEvent('clearall', {
            bubbles: true, composed: true, detail: { removedItems: removedItems }
        }));
    }


    getSelectedItems() {
        if (this._isServerConfigured()) {
            this._syncAllTagsToServer(); // Fire and forget sync
        } else {
             console.log("[MultiSelectAutocompleteComponent] getSelectedItems: server not configured. Skipping sync.");
        }
        return [...this.selectedItems]; // Return current local state
    }

    setSuggestions(suggestionsArray) {
        this.allSuggestionsData = this._processStringArray(suggestionsArray);
        // Refresh list only if it's currently relevant (visible or input focused)
        if (this._suggestionsListElement.style.display === 'block' || this.shadowRoot.activeElement === this._inputElement) {
             this._displaySuggestions();
        }
    }

    setSelected(selectedArray) {
        this.selectedItems = this._processStringArray(selectedArray);
        this.selectedItemsSet = new Set(this.selectedItems.map(item => item.toLowerCase()));
        this._renderSelectedLabels();
        // Refresh list only if it's currently relevant
        if (this._suggestionsListElement.style.display === 'block' || this.shadowRoot.activeElement === this._inputElement) {
             this._displaySuggestions();
        }
    }
}

// Define the Custom Element
if (!window.customElements.get('multi-select-autocomplete')) {
    window.customElements.define('multi-select-autocomplete', MultiSelectAutocompleteComponent);
}