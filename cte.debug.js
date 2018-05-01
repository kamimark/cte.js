'use strict';

(() => {
  function ready(fn) {
    if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading"){
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }    
  }

  function createObject(fullPath, root) {
    const paths = fullPath.split('.');
    for (const path of fullPath) {
      if (!root[path]) {
        root[path] = {};
      }
      root = root[path];
    }

    return root;
  }

  function getObjectValue(obj, dataPath) {
    if (dataPath == "this")
      return obj;

    let value = obj;
    for (const path of dataPath.split('.')) {
      value = value[path];
    }

    return value;
  }
  
  const specialInputPopulators = {
    get_number(el, value) {
      if (value === null || value === undefined)
        value = el.getAttribute('defaultValue');
      if (value === null || value === undefined)
        value = el.getAttribute('min');
      return value === null || value === undefined ? '' : value;
    },
    checkbox(el, value) {
      el.checked = (value && value != "false");
    },
    number(el, value) {
      el.value = this.get_number(el, value);
    },
    range(el, value) {
      value = this.get_number(el, value);
      el.value = value ? value : 0;
    }
  }
  
  const specialPopulators = {
    INPUT(el, value) {
      const type = el.getAttribute('type');
      if (type in specialInputPopulators)
        specialInputPopulators[type](el, value);
      else
        el.value = value;
    },
    SELECT(el, value) {
      el.value = value;
    }
  }
  
  function populateValue(el, value) {
    if (el.tagName in specialPopulators)
      specialPopulators[el.tagName](el, value);
    else
      el.innerHTML = value ? value : '';
  }

  function populateAttributes(el, attributes) {
    for (const attributeName in attributes)
      if (attributes[attributeName])
        el.setAttribute(attributeName, attributes[attributeName]);
  }

  function populateInnerTemplate(container, objects) {
    const ref = container.getAttribute('cte-ref');
    if (ref)
      for (const obj of objects)
        newDomUsingTemplateId(ref, container, obj);
    else
      populateAnonymousTemplate(container, objects);
  }
  
  function populateAnonymousTemplate(container, objects) {
    if (!container.anonymousTemplateChildren) {
      container.anonymousTemplateChildren = Array.from(container.children);
      for (const el of container.anonymousTemplateChildren) {
        container.removeChild(el);
      }
    }

    if (container.tagName == "SELECT") {
      for (const i = 0; i < container.length; ++i)
        container.remove(i);

      for (const option of objects) {
        const element = option.element ? option.element : 'option';
        const o = document.createElement(element);
        for (const key of Object.keys(option))
          if (key != 'element')
            if (key == 'text')
              o.text = option[key];
            else
              o.setAttribute(key, option[key]);

        container.add(o);
      }
    } else {
      for (const i in objects) {
        for (const child of container.anonymousTemplateChildren) {
          const freshChild = child.cloneNode(true);
          put(freshChild, objects[i]);
          container.appendChild(freshChild);
        }
      }
    }
  }

  function getTemplate(id) {
    const template = appScope.templates[id];
    return template.cloneNode(true);
  }
  
  function put(template, obj) {
    for (const el of template.querySelectorAll('[attrs]')) {
      const dataPath = el.getAttribute('attrs');
      populateAttributes(el, getObjectValue(obj, dataPath));
    }

    for (const el of template.querySelectorAll('[data]')) {
      const dataPath = el.getAttribute('data');
      const objectValue = getObjectValue(obj, dataPath);
      if (Array.isArray(objectValue))
        populateInnerTemplate(el, objectValue);
      else
        populateValue(el, objectValue);
    }
  }

  function newDom(template, container, object) {
    put(template, object);
    container.appendChild(template);
    return template;
  }

  function newDomUsingTemplateId(templateId, container, object) {
    const template = getTemplate(templateId);
    if (template)
      return newDom(template, container, object)
    else
      console.error(`Cannot find template with id ${templateId}`);
  }

  function newDomUsingSelector(templateId, selector, objects) {
    for (const container of document.querySelectorAll(selector))
      return newDomUsingTemplateId(templateId, container, objects);
  }

  function newDomUsingSelectorAndObjects(templateId, selector, objects) {
    if (Array.isArray(objects)) {
      const result = [];
      for (const obj of objects)
        result.push(newDomUsingSelector(templateId, selector, obj));
      return result;
    } else {
      return newDomUsingSelector(templateId, selector, objects);
    }
  }

  function putObject(template, dataObj) {
    if (Array.isArray(dataObj))
      for (const obj of dataObj)
        put(template, obj);
    else
      put(template, dataObj);
  }

  function getObject(template, dataObj) {
    for (const el of document.querySelectorAll('[data]')) {
      
    }
  }

  const lib = {
    tools: {
      ready,
      createObject
    },
    getTemplate,
    newDom: newDomUsingSelectorAndObjects,
    putObject,
    getObject
  };

  const appScope = lib.tools.createObject('com.mentalelemental.cte', window);
  appScope.templates = {};

  lib.tools.ready(() => {
    for (const template of document.querySelectorAll('[cte-id]')) {
      const id = template.getAttribute('cte-id');
      template.removeAttribute('cte-id');
      template.parentNode.removeChild(template);
      appScope.templates[id] = template;
    }
  });

  window.cte = lib;
})();
