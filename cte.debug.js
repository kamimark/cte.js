'use strict';

(() => {
  const IT = '$it';
  const IT_SELECTOR = '[data="$it"]';
  const SIZE_OF_IT = IT.length;
  const DATA = 'data';
  const DATA_SELECTOR = '[data]';
  const VISIBILITY = 'visibility';
  const VISIBILITY_SELECTOR = '[visibility]';
  const CTE = 'cte';
  const CTE_SELECTOR = '[cte]';
  const CTE_REF = 'cte-ref';
  const CTE_REF_SELECTOR = '[cte-ref]';
  const TRANSFORMER = 'trans';

  const transformers = { _DEFAULTS: {} };
  const defaultTrantransformers = transformers._DEFAULTS;

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

  function parentObjectContainer(el) {
    let parent = el.parentNode;
    while (parent && !parent.hasAttribute(DATA)) {
      parent = parent.parentNode;
    }

    if (!parent)
      console.error(`No parent for ${el} contains ${DATA_SELECTOR}`);
    return parent;
  }


  // General helpers

  function trunc(string, max) {
    if (!string)
      return string;

    if (string.length <= max)
      return string;

    let end = 0;
    let allowed = max;
    let more = 0;
    let perfectFit = false;
    let i = 0;
    for (i = 0; i < string.length && allowed > 0; ++i) {
      if (more == 0)
        --allowed;

      if (string[i] == '&')
        more = allowed;
      else if (string[i] == ';')
        more = 0;

      ++end;
    }

    if (more)
      end = string.lastIndexOf('&') + more;

    if (i + 1 == string.length)
      return string;
    return string.substring(0, end - 2) + '&hellip;';
  }

  function resolveSafe(object, path) {
    return path.split('.').reduce((prev, curr) => {
      if (curr === '')
        return prev;
      if (!prev || !(curr in prev))
        return undefined;
      return prev[curr];
    }, object);
  }

  function insertSafe(object, path, value) {
    if (typeof object != "object")
      return console.error(`insertSafe Object for path ${path} is not an object`);

    let root = object;
    const paths = path.split('.');

    const lastIndex = paths.length - 1;
    for (let i = 0; i < lastIndex; ++i) {
      const path = paths[i];
      if (typeof root[path] == "object")
        root = root[path];
      else
        root = root[path] = {};
    }

    root[paths[lastIndex]] = value;
    return object;
  }

  /*
  function resolveSafe(object, path) {
    if (!path)
      return undefined;
    path = path.trim();
    if (!path)
      return undefined;

    const randomString = 'qwertyuiopasdfghjklzxcvbnmqwertyuiop';
    window[randomString] = object;
    let result;
    try
    {
      result = eval(`${randomString}.${path}`);
    } catch(e) {
      return undefined;
    }
    delete window[randomString];
    return result;
  }
*/

  
/*
  function merge(to, from) {
    for (const key of Object.keys(from)) {
      const fObj = from[key];
      const tObj = to[key];
      if (tObj) {
        if (typeof tObj != typeof fObj)
          return console.error('Type mismatch');

        if (typeof tObj == "object") {
          merge(tObj, fObj);
        } else if (Array.isArray(tObj)) {
          for (const o of fObj)
            tObj.push(o);
        } else {
          to[key] = fObj;
        }
      } else {
        to[key] = fObj;
      }
    }

    return to;
  }

*/
  function getNumberFromElement(el, value) {
    if (value === null || value === undefined) {
      if (el.defaultValue)
        return el.defaultValue;
      if (el.min || el.min === 0)
        return el.min;
      return 0;
    } else {
      return value * 1
    }
  }


  // Lib core

  function getElementValue(el) {
    const customTransformer = el.getAttribute(TRANSFORMER);
    if (customTransformer) {
      if (transformers[customTransformer])
        return transformers[customTransformer].get(el);
      else
        return console.error(`Custom transformer ${customTransformer} specified but not defined.`);
    }

    const defaultTrantransformer = defaultTrantransformers[el.tagName];
    if (defaultTrantransformer) {
      if (defaultTrantransformer.get)
        return defaultTrantransformer.get(el);
      return el.originalValue;
    } else {
      return el.innerHTML;
    }
  }

  function setElementValue(el, value) {
    const customTransformer = el.getAttribute(TRANSFORMER);
    if (customTransformer) {
      if (transformers[customTransformer])
        return transformers[customTransformer].set(el, value);
      else
        return console.error(`Custom transformer ${customTransformer} specified but not defined.`);
    }

    const defaultTrantransformer = defaultTrantransformers[el.tagName];
    if (defaultTrantransformer) {
      if (!defaultTrantransformer.get)
        el.originalValue = value;
      return defaultTrantransformer.set(el, value);
    } else {
      el.innerHTML = value === undefined || value === null ? '' : value;
    }
  }

  function getTemplate(id) {
    if (id in templates) {
      const template = templates[id].cloneNode(true);
      template.removeAttribute(CTE);
      
      return template;
    } else {
      console.error(`Template ${id} not defined`);
    }
  }

  function resolveIT(template, scope) {
    for (const el of template.querySelectorAll(IT_SELECTOR)) {
      const parentEl = parentObjectContainer(el);
      el.setAttribute('parent-data', parentEl.getAttribute(DATA));
      el.removeAttribute(DATA);
    }
  }

  function resolveTemplate(template, object, objDataPath = '') {
    for (const el of template.querySelectorAll(DATA_SELECTOR)) {
      let elDataPath = el.getAttribute(DATA);
      if (elDataPath.startsWith(IT))
        if (elDataPath == IT)
          elDataPath = elDataPath.substring(SIZE_OF_IT);
        else
          elDataPath = elDataPath.substring(SIZE_OF_IT + 1);

      if (objDataPath && elDataPath)
        elDataPath = '.' + elDataPath;

      const dataPath = objDataPath + elDataPath;
      const objectValue = resolveSafe(object, dataPath);

      if (Array.isArray(objectValue)) {
        if (!el.children.length)
          continue;

        const children = el.cloneNode(true).children;
        removeChildren(el);

        for (let i = 0; i < objectValue.length; ++i) {
          const fakeParent = document.createElement("DIV");
          for (const childTemplate of children)
            fakeParent.appendChild(childTemplate.cloneNode(true));

          resolveTemplate(fakeParent, object, `${dataPath}.${i}`);
          for (const child of fakeParent.children)
            el.appendChild(child);
        }
      } else if (!el.ctePassed) {
        if (typeof objectValue == "function")
          objectValue = objectValue();
        else
          el.cteDataPath = dataPath;
        setElementValue(el, objectValue);
      }

      el.ctePassed = true;
    }

    for (const el of template.querySelectorAll(VISIBILITY_SELECTOR)) {
      const visibilityPath = el.getAttribute(VISIBILITY);
      const objectValue = resolveSafe(object, visibilityPath);
      if (!objectValue)
        el.style.display = 'none';
    }
  }
  
  function expandTemplate(template, object) {
    let refs = template.querySelectorAll(CTE_REF_SELECTOR);
    while (refs.length) {
      for (const el of refs) {
        const refId = el.getAttribute(CTE_REF);
        const dataPath = el.getAttribute(DATA);
        const objectValue = dataPath ? resolveSafe(object, dataPath) : null;
        const isArray = Array.isArray(objectValue);

        el.removeAttribute(CTE_REF);
        removeChildren(el);

        const template = getTemplate(refId);

        if (dataPath) {
          for (const child of template.querySelectorAll(DATA_SELECTOR)) {
            const childDataPath = child.getAttribute(DATA);
            if (childDataPath.startsWith(IT))
              continue;
  
            if (isArray)
              child.setAttribute(DATA, `${IT}.${childDataPath}`);
            else
              child.setAttribute(DATA, `${dataPath}.${childDataPath}`);
          }
        }

        el.appendChild(template);

        if (!isArray)
          el.removeAttribute(DATA);
      }

      refs = template.querySelectorAll(CTE_REF_SELECTOR);
    }    
  }

  function putObject(template, object) {
    if (Array.isArray(object)) {
      console.error("Cannot handle array as object for populating a singular template");
      return;
    }

    expandTemplate(template, object);
    resolveTemplate(template, object);

    for (const el of template.querySelectorAll(DATA_SELECTOR))
      el.ctePassed = false;
  }

  function compress(object) {
    if (typeof object != "object")
      return object;

    const keys = Object.keys(object);
    if (keys.length == 0)
      return object;

    let isArray = true;
    for (const key of keys) {
      if (isNaN(key)) {
        isArray = false;
        break;
      }
    }

    if (isArray) {
      const numericKeys = [];
      for (const key of keys)
        numericKeys.push(key * 1);

      const newObject = [];
      for (const key of numericKeys.sort()) {
        newObject.push(compress(object[key]));
      }

      return newObject;
    }

    for (const key of keys)
      object[key] = compress(object[key]);

    return object;
  }

  function getObject(template) {
    const object = {};
    for (const el of template.querySelectorAll(DATA_SELECTOR)) {
      let dataPath = el.cteDataPath;
      if (dataPath === undefined)
        dataPath = el.getAttribute(DATA);
      insertSafe(object, dataPath, getElementValue(el));
    }
    return compress(object);
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
      for (const object of objects)
        result.push(newDomUsingSelector(templateId, selector, object));
      return result;
    } else {
      return newDomUsingSelector(templateId, selector, objects);
    }
  }

  function newNodeById(templateId, objects) {
    if (Array.isArray(objects)) {
      const result = [];
      for (const object of objects) {
        const template = getTemplate(templateId);
        putObject(template, object);
        result.push(template);
      }
      return result;
    } else {
      const template = getTemplate(templateId);
      putObject(template, objects);
      return template;
    }
  }

  const lib = {
    getTemplate,
    newNodeById: newNodeById,
    newDom: newDomUsingSelectorAndObjects,
    newDomByContainer : newDomUsingTemplateId,
    getObject,
    putObject,
    transformers,
  };

  const appScope = insertSafe(window, 'com.mental-elemental.cte', {});
  appScope.lib = lib;
  const templates = {};

  ready(() => {
    for (const template of document.querySelectorAll(CTE_SELECTOR)) {
      const id = template.getAttribute(CTE);
      template.removeAttribute(CTE);
      template.parentNode.removeChild(template);
      templates[id] = template;
    }    
  });

  window.cte = lib;

  // Transformers
  const valueTransformer = {
    set(el, value) {
      el.value = value === undefined || value === null ? '' : value;
    },
    get(el) {
      return el.value;
    }
  };

  const numberValueTransformer = {
    set(el, value) {
      if (isNaN(value) && value !== undefined)
        return console.error(`Attempt to set into el value ${value} as a number`);
      el.value = value * 1;
    },
    get(el) {
      return getNumberFromElement(el, el.value);
    }
  };

  const srcTransformer = {
    set(el, value) {
      el.src = value;
    },
    get(el) {
      return el.src;
    }
  };

  transformers['html-object'] = {
    set(el, object) {
      el.originalKeys = Object.keys(object);
      for (const key of el.originalKeys) {
        if (object[key] !== undefined)
          el[key] = object[key];
      }
    }, get(el) {
      const object = {};
      for (const key of el.originalKeys) {
        object[key] = el[key];
      }
      return object;
    }    
  };

  transformers['attr-object'] = {
    set(el, object) {
      el.originalKeys = Object.keys(object);
      for (const key of el.originalKeys)
        if (object[key] !== undefined)
          el.setAttribute(key, object[key]);
    }, get(el) {
      const object = {};
      for (const key of el.originalKeys)
        object[key] = el.getAttribute(key);
      return object;
    }    
  };
  
  transformers['value'] = valueTransformer;
  transformers['number-value'] = numberValueTransformer;
  transformers['src-transformer'] = srcTransformer;

  defaultTrantransformers['A'] = {
    set(el, value) {
      el.href = value;
      if (!el.innerHTML)
        el.innerHTML = value;
    },
    get(el) {
      return el.href;
    }
  };

  defaultTrantransformers['IMG'] = srcTransformer;
  defaultTrantransformers['IFRAME'] = srcTransformer;
  defaultTrantransformers['SELECT'] = valueTransformer;
  defaultTrantransformers['TEXTAREA'] = valueTransformer;
  defaultTrantransformers['INPUT'] = {
    range: numberValueTransformer,
    number: numberValueTransformer,
    checkbox: {
      set(el, value) {
        el.checked = (value && value != "false");
      },
      get(el) {
        return el.checked;
      }
    },
    set(el, value) {
      const type = el.getAttribute('type');
      if (this[type])
        this[type].set(el, value);
      else
        valueTransformer.set(el, value);
    },
    get(el) {
      const type = el.getAttribute('type');
      if (this[type])
        return this[type].get(el);
      else
        return valueTransformer.get(el);
    }
  };
})();