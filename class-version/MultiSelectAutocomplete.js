// MultiSelectAutocomplete.js (Optimized Version)

class MultiSelectAutocomplete {
    // Static properties first
    static defaultOptions = {
        suggestions: [],
        selected: [],
        placeholder: 'Type to search...',
        maxSuggestions: 10,
        wrapperClass: 'autocomplete-container',
        labelsClass: 'selected-labels-container',
        labelClass: 'selected-label',
        removeClass: 'remove-label-btn',
        clearClass: 'clear-all-btn',
        inputClass: 'autocomplete-input',
        suggestionsListClass: 'suggestions-list',
        suggestionItemClass: 'suggestion-item',
        highlightClass: 'highlighted',
        onAdd: (item) => { },
        onRemove: (item) => { },
        onClearAll: (removedItems) => { } // Add param for consistency
    };

    // Private fields (using # prefix for encapsulation - requires modern JS support)
    // Or keep as regular properties if broader compatibility needed. Let's use regular for now.
    // #options; #inputElement; #wrapperElement; #selectedLabelsContainer; ... (etc.)

    constructor(inputElementOrSelector, options = {}) {
        // 1. Validate and get the input element
        const inputElement = typeof inputElementOrSelector === 'string'
            ? document.querySelector(inputElementOrSelector)
            : inputElementOrSelector;

        if (!inputElement || inputElement.tagName !== 'INPUT') {
            console.error('MultiSelectAutocomplete: Invalid input element provided.', inputElementOrSelector);
            return;
        }
        if (inputElement.dataset.multiSelectAutocompleteInitialized) {
            console.warn('MultiSelectAutocomplete: Already initialized on this element.');
            return;
        }
        this.inputElement = inputElement;
        this.inputElement.dataset.multiSelectAutocompleteInitialized = true; // Mark as initialized

        // 2. Merge options
        this.options = { ...MultiSelectAutocomplete.defaultOptions, ...options };

        // 3. Validate suggestions array
        if (!Array.isArray(this.options.suggestions)) {
            console.error('MultiSelectAutocomplete: "suggestions" option must be an array.');
            delete this.inputElement.dataset.multiSelectAutocompleteInitialized; // Clean up init flag
            return;
        }

        // 4. Process initial data (using helper for clarity)
        this.allSuggestionsData = this._processStringArray(this.options.suggestions);
        this.selectedItems = this._processStringArray(this.options.selected);
        // Optimization: Use a Set for fast lookups of selected items
        this.selectedItemsSet = new Set(this.selectedItems.map(item => item.toLowerCase())); // Store lowercase for case-insensitive checks

        // 5. Initialize state
        this.currentFilteredSuggestions = [];
        this.highlightedIndex = -1;
        this.isDestroyed = false;

        // 6. Bind event handlers (using arrow functions implicitly binds 'this')
        // No need for separate .bind(this) calls if using arrow functions for handlers
        // Example: this.handleInput = () => { ... }
        // However, keeping separate bound methods is fine and sometimes preferred for clarity/testing. Let's keep the explicit bind.
        this._bindEventHandlers(); // Moved binding logic to separate method

        // 7. Setup DOM and Attach listeners
        this._setupDOM();
        this._attachEventListeners();

        // 8. Initial UI setup
        this.renderSelectedLabels(); // Render initial selection
        this.inputElement.placeholder = this.options.placeholder;
        this.inputElement.setAttribute('autocomplete', 'off');
        this.inputElement.setAttribute('aria-expanded', 'false');
        this.inputElement.setAttribute('aria-haspopup', 'listbox');
        this.inputElement.setAttribute('role', 'combobox');
        // suggestionsListElement setup moved to _setupDOM
    }

    // --- Helper Methods ---
    _processStringArray(arr) {
        // Filters array to unique, non-empty, trimmed strings
        if (!Array.isArray(arr)) return [];
        return [...new Set(arr
            .filter(s => typeof s === 'string')
            .map(s => s.trim())
            .filter(s => s.length > 0)
        )];
    }

    _bindEventHandlers() {
        // Store bound versions of handlers for correct 'this' context and easy removal
        this.boundHandleInput = this.handleInput.bind(this);
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleInputClick = this.handleInputClick.bind(this);
        this.boundHandleDocumentClick = this.handleDocumentClick.bind(this);
        this.boundHandleContainerClick = this.handleContainerClick.bind(this);
        this.boundHandleClearAllClick = this.handleClearAllClick.bind(this);
        this.boundHandleLabelContainerClick = this.handleLabelContainerClick.bind(this);
    }

    // --- DOM Setup ---
    _setupDOM() {
        // Use constants for element creation
        const wrapper = document.createElement('div');
        wrapper.className = this.options.wrapperClass;

        const labelsContainer = document.createElement('div');
        labelsContainer.className = this.options.labelsClass;

        const clearButton = document.createElement('span');
        clearButton.className = this.options.clearClass;
        clearButton.innerHTML = '&times;';
        clearButton.title = 'Clear all selections';
        clearButton.style.display = 'none'; // Hide initially
        clearButton.setAttribute('role', 'button');
        clearButton.setAttribute('aria-label', 'Clear all selections');
        clearButton.tabIndex = -1; // Not tabbable by default

        const suggestionsList = document.createElement('ul');
        suggestionsList.className = this.options.suggestionsListClass;
        suggestionsList.style.display = 'none'; // Hide initially
        // Generate a more robust unique ID
        suggestionsList.id = `msa-suggestions-${this.inputElement.id || crypto.randomUUID()}`;
        suggestionsList.setAttribute('role', 'listbox');

        // Store references
        this.wrapperElement = wrapper;
        this.selectedLabelsContainer = labelsContainer;
        this.clearAllButtonElement = clearButton;
        this.suggestionsListElement = suggestionsList;

        // Assemble Structure
        this.inputElement.parentNode.insertBefore(wrapper, this.inputElement);
        wrapper.appendChild(labelsContainer);
        wrapper.appendChild(clearButton);
        wrapper.appendChild(this.inputElement); // Move input inside
        wrapper.appendChild(suggestionsList);

        // Apply optional class to input
        if (this.options.inputClass) {
            this.inputElement.classList.add(this.options.inputClass);
        }
        // Link input to list for ARIA
        this.inputElement.setAttribute('aria-owns', suggestionsList.id);
    }

    // --- Event Binding ---
    _attachEventListeners() {
        // Add all event listeners using the bound handlers
        this.inputElement.addEventListener('input', this.boundHandleInput);
        this.inputElement.addEventListener('keydown', this.boundHandleKeyDown);
        this.inputElement.addEventListener('click', this.boundHandleInputClick);
        this.selectedLabelsContainer.addEventListener('click', this.boundHandleLabelContainerClick);
        this.clearAllButtonElement.addEventListener('click', this.boundHandleClearAllClick);
        this.wrapperElement.addEventListener('click', this.boundHandleContainerClick);
        // Use capture phase for document click to potentially catch clicks sooner? Maybe not necessary.
        document.addEventListener('click', this.boundHandleDocumentClick);
    }

    _removeEventListeners() {
        // Remove all event listeners during destroy
        this.inputElement.removeEventListener('input', this.boundHandleInput);
        this.inputElement.removeEventListener('keydown', this.boundHandleKeyDown);
        this.inputElement.removeEventListener('click', this.boundHandleInputClick);
        // Check elements exist before removing listeners (safer)
        if (this.selectedLabelsContainer) this.selectedLabelsContainer.removeEventListener('click', this.boundHandleLabelContainerClick);
        if (this.clearAllButtonElement) this.clearAllButtonElement.removeEventListener('click', this.boundHandleClearAllClick);
        if (this.wrapperElement) this.wrapperElement.removeEventListener('click', this.boundHandleContainerClick);
        document.removeEventListener('click', this.boundHandleDocumentClick);
    }


    // --- Event Handlers ---
    handleInput() {
        if (this.isDestroyed) return;
        this.displaySuggestions();
    }

    handleKeyDown(e) {
        if (this.isDestroyed) return;

        const isListVisible = this.suggestionsListElement.style.display === 'block';
        // Cache list items only if list is visible to avoid unnecessary querySelectorAll
        const listItems = isListVisible ? this.suggestionsListElement.querySelectorAll(`.${this.options.suggestionItemClass}`) : [];
        const numSuggestions = listItems.length;

        let preventDefault = false;

        switch (e.key) {
            case 'ArrowDown':
                preventDefault = true; // Prevent cursor move/scroll
                if (!isListVisible && this.inputElement.value.trim().length > 0) {
                    this.displaySuggestions(); // Open list
                } else if (isListVisible && numSuggestions > 0) {
                    this.highlightedIndex = (this.highlightedIndex + 1) % numSuggestions;
                    this.updateHighlight();
                }
                break;

            case 'ArrowUp':
                preventDefault = true; // Prevent cursor move/scroll
                if (isListVisible && numSuggestions > 0) {
                    this.highlightedIndex = (this.highlightedIndex - 1 + numSuggestions) % numSuggestions;
                    this.updateHighlight();
                }
                break;

            case ' ': // Spacebar = Multi-select behavior
                if (isListVisible && this.highlightedIndex > -1 && numSuggestions > 0) {
                    preventDefault = true; // Prevent typing space only when selecting
                    const highlightedLi = listItems[this.highlightedIndex];
                    // Check highlightedLi exists (safer)
                    if (highlightedLi) {
                        const valueToAdd = highlightedLi.dataset.addNewValue || highlightedLi.textContent;
                        if (valueToAdd) {
                            this.addItem(valueToAdd); // Keeps list open
                        }
                    }
                }
                // Allow space typing otherwise
                break;

            case 'Enter': // Enter = Single-select OR Add Raw, then Reset
                preventDefault = true; // Always prevent default form submission
                let valueToAddEnter = null;

                if (isListVisible && this.highlightedIndex > -1 && listItems[this.highlightedIndex]) {
                    // Use highlighted item value
                    const highlightedLi = listItems[this.highlightedIndex];
                    valueToAddEnter = highlightedLi.dataset.addNewValue || highlightedLi.textContent;
                } else {
                    // Use raw input value if not empty
                    const rawInputValue = this.inputElement.value.trim();
                    if (rawInputValue.length > 0) {
                        valueToAddEnter = rawInputValue;
                    }
                }

                // Attempt add if we have a value
                if (valueToAddEnter) {
                    this.addItem(valueToAddEnter);
                }

                // **Enter specific action**: Clear input and hide list
                this.inputElement.value = '';
                this.hideSuggestions();
                break;

            case 'Escape':
                if (isListVisible) { // Only act if list is visible
                    preventDefault = true;
                    this.hideSuggestions();
                }
                break;

            default: // Any other key press
                if (isListVisible) {
                    // Reset highlight index when user types other keys
                    this.highlightedIndex = -1;
                    this.updateHighlight(false); // Update visual only
                }
                break;
        }

        if (preventDefault) {
            e.preventDefault();
        }
    }

    handleInputClick(e) {
        if (this.isDestroyed) return;
        e.stopPropagation(); // Prevent document click handler from closing list immediately
        // Show suggestions if input has value and list is hidden
        if (this.inputElement.value.trim().length > 0 && this.suggestionsListElement.style.display === 'none') {
            this.displaySuggestions();
        }
    }

    handleLabelContainerClick(e) {
        if (this.isDestroyed) return;
        // Use event delegation - check if the clicked element is the remove button itself
        if (e.target.classList.contains(this.options.removeClass)) {
            e.stopPropagation();
            // Find the parent label to get the value
            const labelElement = e.target.closest('.' + this.options.labelClass);
            const itemToRemove = labelElement?.dataset.value; // Use optional chaining
            if (itemToRemove) {
                this.removeItem(itemToRemove);
                this.inputElement.focus(); // Maintain focus
            }
        }
    }

    handleClearAllClick(e) {
        if (this.isDestroyed) return;
        e.stopPropagation();
        this.clearSelection(true); // Pass flag for callback
        this.inputElement.focus(); // Maintain focus
    }

    handleContainerClick(e) {
        if (this.isDestroyed) return;
        const target = e.target;
        // Focus input only if clicking on non-interactive background areas
        if ((target === this.wrapperElement || target === this.selectedLabelsContainer) &&
            !target.closest('.' + this.options.removeClass) && // Exclude remove button clicks
            target !== this.clearAllButtonElement &&          // Exclude clear all button
            target !== this.inputElement &&                   // Exclude input itself
            !target.closest('.' + this.options.suggestionItemClass) // Exclude suggestion items
        ) {
            this.inputElement.focus();
        }
    }

    handleDocumentClick(e) {
        if (this.isDestroyed || !this.wrapperElement) return; // Extra safety check
        // If the click is outside the main component wrapper, hide suggestions
        if (!this.wrapperElement.contains(e.target)) {
            this.hideSuggestions();
        }
    }


    // --- Core Logic Methods ---
    renderSelectedLabels() {
        if (this.isDestroyed) return;

        // Use DocumentFragment for potentially better performance when adding many labels
        const fragment = document.createDocumentFragment();
        this.selectedItems.forEach(item => {
            // Create elements (consider cloning a template node if performance is critical for vast numbers)
            const labelSpan = document.createElement('span');
            labelSpan.className = this.options.labelClass;
            labelSpan.textContent = item;
            labelSpan.dataset.value = item; // Store value for removal

            const removeBtn = document.createElement('span');
            removeBtn.className = this.options.removeClass;
            removeBtn.innerHTML = '&times;'; // Use innerHTML for entities
            removeBtn.title = `Remove ${item}`;
            removeBtn.setAttribute('role', 'button');
            removeBtn.setAttribute('aria-label', `Remove ${item}`);
            removeBtn.tabIndex = -1; // Keep it non-focusable

            labelSpan.appendChild(removeBtn);
            fragment.appendChild(labelSpan); // Add to fragment
        });

        // Clear container and append fragment efficiently
        this.selectedLabelsContainer.innerHTML = '';
        this.selectedLabelsContainer.appendChild(fragment);

        // Toggle clear button visibility
        this.clearAllButtonElement.style.display = this.selectedItems.length > 0 ? 'inline-block' : 'none';
    }

    displaySuggestions() {
        if (this.isDestroyed) return;
        const rawInputValue = this.inputElement.value.trim();
        const lowerInputValue = rawInputValue.toLowerCase();

        // Clear previous suggestions efficiently
        this.suggestionsListElement.innerHTML = '';
        // Reset filtered suggestions list
        this.currentFilteredSuggestions = [];

        // Only proceed if there's input
        if (lowerInputValue.length === 0) {
            this.hideSuggestions();
            return;
        }

        // --- Filter existing suggestions ---
        // Optimization: Use selectedItemsSet for faster checks
        this.currentFilteredSuggestions = this.allSuggestionsData.filter(suggestion =>
            !this.selectedItemsSet.has(suggestion.toLowerCase()) &&
            suggestion.toLowerCase().includes(lowerInputValue)
        );

        // --- Check if "Add New" option should be shown ---
        let canAddNew = false;
        // Optimization: Use selectedItemsSet
        if (rawInputValue.length > 0) {
            const isExactMatchSuggestion = this.allSuggestionsData.some(s => s.toLowerCase() === lowerInputValue);
            const isAlreadySelected = this.selectedItemsSet.has(lowerInputValue);
            canAddNew = !isExactMatchSuggestion && !isAlreadySelected;
        }

        const fragment = document.createDocumentFragment(); // Use fragment for list items

        // --- Prepend "Add New" item if applicable ---
        if (canAddNew) {
            const addNewLi = this._createSuggestionLi(
                `Add "${rawInputValue}"`, // Text content
                `${this.options.suggestionItemClass} add-new-item`, // Classes
                `${this.suggestionsListElement.id}-addnew` // ID
            );
            addNewLi.dataset.addNewValue = rawInputValue; // Store value
            // Add click listener directly (avoids iterating later)
            addNewLi.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addItem(rawInputValue);
            });
            fragment.appendChild(addNewLi); // Add to fragment
        }

        // --- Append filtered suggestions ---
        this.currentFilteredSuggestions
            .slice(0, this.options.maxSuggestions)
            .forEach((suggestion, index) => {
                const listItem = this._createSuggestionLi(
                    suggestion, // Text content
                    this.options.suggestionItemClass, // Class
                    `${this.suggestionsListElement.id}-item-${index}` // ID
                );
                // Add click listener directly
                listItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.addItem(suggestion);
                });
                fragment.appendChild(listItem); // Add to fragment
            });

        // Append all items at once and show/hide list
        if (fragment.hasChildNodes()) { // Check if fragment has anything to add
            this.suggestionsListElement.appendChild(fragment);
            this.highlightedIndex = -1; // Reset highlight
            this.updateHighlight(false); // Clear visual highlight
            this.suggestionsListElement.style.display = 'block';
            this.inputElement.setAttribute('aria-expanded', 'true');
        } else {
            this.hideSuggestions();
        }
    }

    // Helper to create suggestion list items consistently
    _createSuggestionLi(textContent, className, id) {
        const listItem = document.createElement('li');
        listItem.className = className;
        listItem.textContent = textContent;
        listItem.setAttribute('role', 'option');
        listItem.id = id;
        return listItem;
    }

    hideSuggestions() {
        // Prevent unnecessary style changes if already hidden
        if (this.suggestionsListElement.style.display !== 'none') {
            this.suggestionsListElement.style.display = 'none';
            this.inputElement.setAttribute('aria-expanded', 'false');
            this.inputElement.removeAttribute('aria-activedescendant');
            this.highlightedIndex = -1;
        }
    }

    updateHighlight(shouldScroll = true) {
        if (this.isDestroyed) return;
        const listItems = this.suggestionsListElement.querySelectorAll(`.${this.options.suggestionItemClass}`);
        let activeDescendantId = null;

        // Directly manipulate classList and attributes
        listItems.forEach((item, index) => {
            const shouldHighlight = index === this.highlightedIndex;
            item.classList.toggle(this.options.highlightClass, shouldHighlight);
            if (shouldHighlight) {
                item.setAttribute('aria-selected', 'true');
                activeDescendantId = item.id;
                if (shouldScroll) {
                    item.scrollIntoView({ block: 'nearest' });
                }
            } else {
                item.removeAttribute('aria-selected');
            }
        });

        // Update input's active descendant
        if (activeDescendantId) {
            this.inputElement.setAttribute('aria-activedescendant', activeDescendantId);
        } else {
            this.inputElement.removeAttribute('aria-activedescendant');
        }
    }

    // --- Public API Methods ---

    addItem(itemText, triggeredByUser = true) {
        const trimmedItemText = itemText?.trim();
        if (this.isDestroyed || !trimmedItemText) {
            if (this.inputElement && !this.isDestroyed) this.inputElement.focus();
            return false;
        }

        const lowerTrimmedItemText = trimmedItemText.toLowerCase();
        // Optimization: Use Set for checking selection
        if (!this.selectedItemsSet.has(lowerTrimmedItemText)) {
            this.selectedItems.push(trimmedItemText); // Add original case
            this.selectedItemsSet.add(lowerTrimmedItemText); // Add lowercase to Set

            this.renderSelectedLabels();
            this.displaySuggestions(); // Refresh suggestions list

            this._safelyCallCallback(this.options.onAdd, trimmedItemText, triggeredByUser);

            this.inputElement.focus(); // Keep focus
            return true;
        }

        this.inputElement.focus(); // Keep focus even if not added
        return false;
    }

    removeItem(itemText, triggeredByUser = true) {
        if (this.isDestroyed || !itemText) return false;

        const lowerItemText = itemText.toLowerCase();
        // Optimization: Check Set first if item actually exists
        if (this.selectedItemsSet.has(lowerItemText)) {
            // Filter the array (keeping original case)
            this.selectedItems = this.selectedItems.filter(item => item.toLowerCase() !== lowerItemText);
            // Update the Set
            this.selectedItemsSet.delete(lowerItemText);

            this.renderSelectedLabels();
            this.displaySuggestions(); // Refresh suggestions list

            this._safelyCallCallback(this.options.onRemove, itemText, triggeredByUser);

            return true; // Item was removed
        }
        return false; // Item was not selected
    }

    clearSelection(triggeredByUser = true) {
        if (this.isDestroyed || this.selectedItems.length === 0) {
            return; // Nothing to clear
        }

        const removedItems = [...this.selectedItems]; // Copy for callback

        this.selectedItems = [];
        this.selectedItemsSet.clear(); // Clear the Set

        this.renderSelectedLabels();
        this.displaySuggestions(); // Refresh suggestions list

        this._safelyCallCallback(this.options.onClearAll, removedItems, triggeredByUser);
    }

    // Helper for safely calling callbacks
    _safelyCallCallback(callback, args, triggeredByUser) {
        if (triggeredByUser && typeof callback === 'function') {
            try {
                // Pass arguments based on expected signature
                if (callback === this.options.onClearAll) {
                    callback(args); // onClearAll expects array
                } else {
                    callback(args); // onAdd/onRemove expect item string
                }
            } catch (e) {
                console.error(`Error in ${callback.name} callback:`, e);
            }
        }
    }

    getSelectedItems() {
        // Return a defensive copy
        return this.isDestroyed ? [] : [...this.selectedItems];
    }

    destroy() {
        if (this.isDestroyed) return;

        this._removeEventListeners(); // Use helper

        // Restore original input element state
        if (this.wrapperElement?.parentNode) { // Check parentNode exists
            this.wrapperElement.parentNode.insertBefore(this.inputElement, this.wrapperElement);
            this.wrapperElement.remove();
        }

        // Clean up input element attributes and classes
        this.inputElement.classList.remove(this.options.inputClass);
        this.inputElement.removeAttribute('autocomplete');
        this.inputElement.removeAttribute('aria-expanded');
        this.inputElement.removeAttribute('aria-haspopup');
        this.inputElement.removeAttribute('role');
        this.inputElement.removeAttribute('aria-owns');
        this.inputElement.removeAttribute('aria-activedescendant');
        // Restore original placeholder? Requires storing it first in constructor.
        // this.inputElement.placeholder = this.originalPlaceholder || '';
        delete this.inputElement.dataset.multiSelectAutocompleteInitialized;

        // Nullify references to help garbage collection
        this.inputElement = null;
        this.wrapperElement = null;
        this.selectedLabelsContainer = null;
        this.clearAllButtonElement = null;
        this.suggestionsListElement = null;
        this.selectedItems = null;
        this.selectedItemsSet = null; // Nullify the Set too
        this.allSuggestionsData = null;
        this.currentFilteredSuggestions = null;
        this.options = null;
        // Nullify bound handlers if needed, though GC should handle them if no longer referenced
        // this.boundHandleInput = null; ... etc.

        this.isDestroyed = true;
        // console.log('MultiSelectAutocomplete instance destroyed.'); // Optional log
    }
}

// Optional: Export if using modules
// export default MultiSelectAutocomplete;