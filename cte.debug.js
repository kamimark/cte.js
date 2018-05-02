'use strict';

(() => {
  const THIS = 'this';
  const OPTIONS = 'cte-options';
  const OPTIONS_SELECTOR = '[cte-options]';
  const DATA = 'data';
  const DATA_SELECTOR = '[data]';
  const DATA_TYPE = 'data-type';
  const DATA_TYPE_SELECTOR = '[data-type]';
  const CTE = 'cte';
  const CTE_SELECTOR = '[cte]';
  const CTE_REF = 'cte-ref';
  const ATTRS_SELECTOR = '[attrs]';
  const ATTRS = 'attrs';
  const ANONYMOUS_CTE_START = 'anonymous_cte_template_';

  // DOM helpers

  function ready(fn) {
    if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading"){
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }    
  }

  function removeChildren(el) {
    while (el.lastChild)
      el.removeChild(el.lastChild);
  }

  function setAttributes(el, attributes) {
    for (const attributeName in attributes)
      el.setAttribute(attributeName, attributes[attributeName]);
  }



  // General helpers

  function resolveSafe(obj, paths) {
    return paths.reduce((prev, curr) => {
        if (!prev || !(curr in prev))
          return undefined;
        return prev[curr];
    }, obj);
  }

  function insertSafe(obj, paths, value) {
    let parentRoot;
    let root = obj;
    const key = paths.pop();

    for (const i in paths) {
      const path = paths[i];
      if (path == "0" && !Array.isArray(root)) {
        root = {};
        parentRoot[paths[i - 1]] = [root];
      } else {
        if (!(path in root))
          root[path] = {};
        parentRoot = root;
        root = root[path]; 
      }
    }

    if (!Array.isArray(root) || key in root)
      root[key] = value;
    else
      root.push(value);
    return obj;
  }



  // Lib core

  const base = {
    wrapType(el, value) {
      switch (el.getAttribute(DATA_TYPE)) {
        case "number":
          return value * 1;
        default:
          return value;
      }
    },
    getNumber(el, value) {
      if (value === null || value === undefined)
        value = el.getAttribute('defaultValue');
      if (value === null || value === undefined)
        value = el.getAttribute('min');
      return value === null || value === undefined ? '' : value;
    },
    specialInputTags: {
      checkbox: { 
        set(el, value) {
          el.checked = (value && value != "false");
        },
        get(el) {
          return el.checked;
        }
      },
      number: {
        set(el, value) {
          el.value = base.getNumber(el, value);
        },
        get (el) {
          return el.value * 1;
        }
      },
      range: {
        set(el, value) {
          value = base.getNumber(el, value);
          el.value = value ? value : 0;
        },
        get(el) {
          return el.value * 1;
        }
      }
    },
    specialTags: {
      INPUT: {
        set(el, value) {
          const type = el.getAttribute('type');
          if (type in base.specialInputTags)
            base.specialInputTags[type].set(el, value);
          else
            el.value = value ? value : '';
        },
        get(el) {
          const type = el.getAttribute('type');
          if (type in base.specialInputTags)
            return base.specialInputTags[type].get(el);
          else
            return el.value;
        }
      },
      SELECT: {
        set(el, value) {
          el.value = value;
        },
        get(el) {
          return el.value;
        }
      }
    },
    get(el, value) {
      if (el.anonymousChildTemplate) {
        if (el.children.length > 1) {
          const result = [];
          for (const child of el.children)
            result.push(getChildObject(child));
          return result;
        } else {
          return getChildObject(el.children[0]);
        }
      } else {
        if (el.tagName in base.specialTags)
          return base.wrapType(el, base.specialTags[el.tagName].get(el));
        else
          return base.wrapType(el, el.innerHTML);
      }
    },
    set(el, value) {
      if (el.tagName in base.specialTags)
        base.specialTags[el.tagName].set(el, value);
      else
        el.innerHTML = value ? value : '';      
    }
  };

  function appendTemplate(el, template, dataPath, objectValue, obj) {
    if (Array.isArray(objectValue)) {
      dataPath += '.';
      for (let i = 0; i < objectValue.length; ++i)
        appendTemplate(el, template.cloneNode(true), dataPath + i, objectValue[i], obj);
    } else {
      for (const child of template.querySelectorAll(DATA_SELECTOR))
        child.setAttribute(DATA, `${dataPath}.${child.getAttribute(DATA)}`);
      el.appendChild(template);
      putObject(template, obj);
    }
  }
  
  function getTemplate(id) {
    if (id in appScope.templates) {
      return appScope.templates[id].cloneNode(true);
    } else {
      console.error(`Template ${id} not defined`);
    }
  }

  
  
  
  
  
  
  
  function putObject(template, obj) {
    for (const el of template.querySelectorAll(ATTRS_SELECTOR)) {
      const dataPath = el.getAttribute('attrs');
      setAttributes(el, resolveSafe(obj, dataPath.split('.')));
    }

    for (const el of template.querySelectorAll(DATA_SELECTOR)) {
      const refId = el.getAttribute(CTE_REF);
      const dataPath = el.getAttribute(DATA);
      const objectValue = resolveSafe(obj, dataPath.split('.'));

      if (refId) {
        removeChildren(el);
        const template = getTemplate(refId);
        appendTemplate(el, template, dataPath, objectValue, obj);
      } else if (Array.isArray(objectValue)) {
        const childTemplate = el.firstChild;
        appendTemplate(el, childTemplate, dataPath, objectValue, obj);
      } else {
        base.set(el, objectValue);
      }
    }
  }

  function updateObject(template, dataObj) {
    if (Array.isArray(dataObj))
      console.error("Cannot handle array as object for populating a singular template");
    else
      putObject(template, dataObj);
  }

  function getObject(template) {
    const object = {};
    for (const el of template.querySelectorAll(DATA_SELECTOR)) {
      const pathAttribute = el.getAttribute(DATA);
      if (!el.hasAttribute(CTE_REF))
        insertSafe(object, pathAttribute.split('.'), base.get(el));
    }
    return object;
  }

  
  
  
  
  // New dom wrappers
  function newDom(template, container, object) {
    putObject(template, object);
    container.appendChild(template);
  }

  function newDomUsingTemplateId(templateId, container, object) {
    const template = getTemplate(templateId);
    if (template)
      newDom(template, container, object)
    else
      console.error(`Cannot find template with id ${templateId}`);
    return template;
  }

  function newDomUsingSelector(templateId, selector, objects) {
    const result = [];
    for (const container of document.querySelectorAll(selector))
      result.push(newDomUsingTemplateId(templateId, container, objects));
    if (result.length == 1)
      return result[0];
    return result;
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

  const lib = {
    getTemplate,
    newDom: newDomUsingSelectorAndObjects,
    updateObject,
    getObject,
//    setDynamicOptions
  };

  const appScope = insertSafe(window, 'com.mental-elemental.cte'.split('.'), {});
  appScope.templates = {};

  ready(() => {
    //let anonymousCount = 0;
    for (const template of document.querySelectorAll(CTE_SELECTOR)) {
      const id = template.getAttribute(CTE);
      template.removeAttribute(CTE);
      template.parentNode.removeChild(template);
      appScope.templates[id] = template;

      // TODO Generate anonymous templates using "this"
    }    
  });

  window.cte = lib;
})();
