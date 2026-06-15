(() => {
  function createCheckbox(i, label, isChecked, onChange) {
    const labelEl = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    if (isChecked) checkbox.checked = true;

    checkbox.onchange = onChange;

    labelEl.appendChild(checkbox);
    const text = document.createTextNode(label);
    const span = document.createElement("span");
    span.appendChild(text);
    labelEl.appendChild(span);

    const lineEl = document.createElement("li");
    lineEl.setAttribute("data-idx", i);
    lineEl.appendChild(labelEl);
    return { el: lineEl, checkbox: checkbox };
  }

  function updateCheckedObjects(event, currentObject, checkedObjects) {
    const current = event.target;
    if (current.checked) {
      if (checkedObjects.includes(currentObject)) return;
      checkedObjects.push(currentObject);
    } else {
      const pos = checkedObjects.indexOf(currentObject);
      if (pos >= 0) {
        checkedObjects.splice(pos, 1);
      }
    }
  }

  function toggleCheckAll(event, objects, checkedObjects, objectBoxes) {
    const current = event.target;
    if (current.checked) {
      objects.map((obj) => {
        if (checkedObjects.includes(obj)) return;
        checkedObjects.push(obj);
      });
    } else {
      checkedObjects.splice(0);
    }

    // Changing an element's checked attribute from JavaScript
    // doesn't fire it's onChange event
    objectBoxes.map((objectBox) => {
      objectBox.checkbox.checked = current.checked;
    });
  }

  function ShowAsFilter(objects, options, onChange) {
    const checkedObjects = options.checkedObjects || [];
    const nameAttribute = options.nameAttribute || "name";

    // Boxes to append
    const objectBoxes = [];

    // Creating checkbox for checkAll
    const allChecked = checkedObjects.length === objects.length;
    const _toggleCheckAll = (event) => {
      toggleCheckAll(event, objects, checkedObjects, objectBoxes);
      onChange(checkedObjects);
    };
    const checkAllBox = createCheckbox(
      "all",
      "Check All",
      allChecked,
      _toggleCheckAll,
    );

    // Creating checkboxes for objects
    for (let i = 0; i < objects.length; i++) {
      const current = objects[i];
      const isChecked = checkedObjects.includes(current);
      const _onChange = ((current) => (event) => {
        updateCheckedObjects(event, current, checkedObjects);
        checkAllBox.checkbox.checked = objects.length === checkedObjects.length;
        onChange(checkedObjects);
      })(current);
      const label = current[nameAttribute];
      const objectBox = createCheckbox(i, label, isChecked, _onChange);
      objectBoxes.push(objectBox);
    }

    // Append the boxes into a menu
    const menu = document.createElement("ul");
    menu.classList.add("dropdown-content");
    if (!options.noCheckAll) menu.appendChild(checkAllBox.el);
    objectBoxes.map((objectBox) => {
      menu.appendChild(objectBox.el);
    });
    return menu;
  }

  window.ShowAsFilter = ShowAsFilter;
})();
