'use strict';

(() => {
  const ITEM = '$i';
  const DATA = 'path';
  const DATA_SELECTOR = '[path]';
  const CTE_REF = 'template';
  const CTE_REF_SELECTOR = '[template]';
  const SETTER = 'set';
  const GETTER = 'get';
  const UNDEFINED = function(){};
  let visibilityClass = 'hidden';

  const setters = {};
  const getters = {};
  const settersDefault = {};
  const gettersDefault = {};
  const _ctePassed = [];

  // Configuration
  const setterArray = (el, array) => {
    const isNew = !el._cteArrayElementSet;
    if (isNew) {
      el._cteArrayElementSet = [];
      for (const child of el.children) {
        el._cteArrayElementSet.push(child);
        for (const dataChild of child.querySelectorAll(DATA_SELECTOR))
          dataChild._ctePassed = true;
      }
    }

    el.innerHTML = '';
    for (const object of array) {
      for (const child of el._cteArrayElementSet) {
        const copy = child.cloneNode(true);
        el.appendChild(_putObject(copy, undefined, object));
      }
    }
  };

  const getterArray = (el) => {
    const result = [];
    if (el.children.length == 0)
      return result;

    if (!el._cteArrayElementSet)
      return console.error('Currently unsupported! Cannot get data from array node that was never set');
    if (!el._cteArrayElementSet.length == 1)
      return console.error('Currently unsupported! Cannot get data from array node that has a composite internal structure');

    for (const child of el.children) {
      let newObject = _getObject(child);
      if (newObject === UNDEFINED)
        return UNDEFINED;

      if (child.hasAttribute(DATA)) {
        let key = getDataPath(child, DATA);
        if (key)
          newObject = { [key]: newObject };
      }

//      if (typeof newObject == 'object' && ITEM in newObject)
        //newObject = newObject[ITEM];

      result.push(newObject);
    }

    return result;
  };

  const setterValue = (el, value) => {
    el.value = value === undefined || value === null ? '' : value;
  };

  const getterValue = (el) => {
    return el.value;
  };

  const setterNumberValue = (el, value) => {
    if (isNaN(value) && value !== undefined)
      return console.error(`Attempt to set into el value ${value} as a number`);
    el.value = value * 1;
  };

  const getterNumberValue = (el) => {
    return getNumberFromElement(el, el.value);
  };

  const setterRaw = (el, value) => {
    el.innerHTML = value;
  };

  const getterRaw = (el) => {
    return el.innerHTML;
  };

  const setterSrc = (el, value) => {
    el.src = value;
  };

  const getterSrc = (el) => {
    return el.src;
  };

  const setterHref = (el, value) => {
    el.href = value;
  };

  const getterHref = (el) => {
    return el.href;
  };

  const setterObject = (el, object) => {
    el._cteOriginalObjectKeys = Object.keys(object);
    for (const key of el._cteOriginalObjectKeys) {
      if (object[key] !== undefined)
        el[key] = object[key];
    }
  };

  const setterAttrObject = (el, object) => {
    el._cteOriginalObjectKeys = Object.keys(object);
    for (const key of el._cteOriginalObjectKeys)
      if (object[key] !== undefined)
        el.setAttribute(key, object[key]);
  };

  const setterVisibility = (el, value) => {
    el.classList.toggle(visibilityClass, !value);
  };

  const getterVisibility = (el) => {
    return !el.classList.contains(visibilityClass);
  };

  const setterInvisibility = (el, value) => {
    el.classList.toggle(visibilityClass, !!value);
  };

  const getterInvisibility = (el) => {
    return el.classList.contains(visibilityClass);
  };

  settersDefault['A'] = (el, value) => {
    setterHref(el, value);
    if (!el.innerHTML)
      el.innerHTML = value;
  };

  gettersDefault['A'] = getterHref;
  settersDefault['IMG'] = setterSrc;
  gettersDefault['IMG'] = getterSrc;
  settersDefault['IFRAME'] = setterSrc;
  gettersDefault['IFRAME'] = getterSrc;
  settersDefault['OBJECT'] = setterSrc;
  gettersDefault['OBJECT'] = getterSrc;
  settersDefault['SELECT'] = setterValue;
  gettersDefault['SELECT'] = getterValue;
  settersDefault['TEXTAREA'] = setterValue;
  gettersDefault['TEXTAREA'] = getterValue;

  setters['visibility'] = setterVisibility;
  getters['visibility'] = getterVisibility;
  setters['invisibility'] = setterInvisibility;
  getters['invisibility'] = getterInvisibility;
  setters['raw'] = setterRaw;
  getters['raw'] = getterRaw;

  setters['html-object'] = setterObject;
  setters['attr-object'] = setterAttrObject;

  const settersInput = {
    range: setterNumberValue,
    number: setterNumberValue,
    checkbox(el, value) {
      el.checked = (value && value != "false");
    },
  };

  const gettersInput = {
    range: getterNumberValue,
    number: getterNumberValue,
    checkbox(el) {
      return el.checked;
    },
  };

  settersDefault['INPUT'] = (el, value) => {
      const type = el.getAttribute('type');
      const setter = settersInput[type];
      if (setter)
        return setter(el, value);
      return setterValue(el, value);
  };

  gettersDefault['INPUT'] = (el) => {
      const type = el.getAttribute('type');
      const getter = gettersInput[type];
      if (getter)
        return getter(el);
      return getterValue(el);
  };
  
  
  
  // DOM helpers

  function ready(fn) {
    if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  // General helpers

  function resolveSafe(object, path) {
    if (!path)
      return object;

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
    return value;
  }

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
    const customGetterName = el.getAttribute(GETTER);
    if (customGetterName) {
      const getter = getters[customGetterName];
      if (getter)
        return getter(el);
      return console.error(`Custom getter ${customGetterName} specified but not defined.`);
    }

    if (Array.isArray(el._cteOriginalValue))
      return getterArray(el);

    const getter = gettersDefault[el.tagName];
    if (getter)
      return getter(el);

    return UNDEFINED;
  }

  function setElementValue(el, value) {
    el._cteOriginalValue = value;

    const customSetterName = el.getAttribute(SETTER);
    if (customSetterName) {
      const setter = setters[customSetterName];
      if (setter)
        return setter(el, value);
      return console.error(`Custom setter ${customSetterName} specified but not defined.`);
    }

    if (Array.isArray(value))
      return setterArray(el, value);

    const setter = settersDefault[el.tagName];
    if (setter)
      return setter(el, value);

    if (typeof value != 'object')
      return el.innerHTML = value === undefined || value === null ? '' : value;
    return value;
  }

  function getTemplate(id) {
    if (id in templates) {
      const template = templates[id].cloneNode(true);
      return template;
    } else {
      console.error(`Template ${id} not defined`);
    }
  }

  function resolveDataPath(node, fullObject, parentObject) {
    let dataPath = node.getAttribute(DATA);
    if (!dataPath)
      return UNDEFINED;

    if (dataPath.startsWith(ITEM)) {
      dataPath = dataPath.substr(ITEM.length + 1);
      if (parentObject === undefined) {
        console.warn(`${ITEM} found without parent object. Assuming fullObject`);
        parentObject = fullObject;
      }
      return resolveSafe(parentObject, dataPath);
    } else {
      return resolveSafe(fullObject, dataPath);
    }
  }

  function _putObject(node, fullObject, parentObject) {
    if (node._ctePassed)
      return node;

    let object = resolveDataPath(node, fullObject, parentObject);

    if (object === UNDEFINED) {
      object = parentObject;
    } else {
      if (typeof object == "function")
        object = object();
      setElementValue(node, object);
    }

    for (const child of node.querySelectorAll(DATA_SELECTOR))
      if (node.contains(child)) // Might have been removed by previous child processing
        _putObject(child, fullObject, object);

    node._ctePassed = true;
    _ctePassed.push(node);

    return node;
  }

  function _expandRefTemplate(container) {
    const refId = container.getAttribute(CTE_REF);
    if (container.innerHTML)
      console.warn(`Destroyed content cause of refId [${refId}]`);
    const node = getTemplate(refId);
    container.removeAttribute(CTE_REF);
    container.innerHTML = '';
    container.appendChild(node);
    for (let child of container.querySelectorAll(DATA_SELECTOR)) {
      const dataPath = child.getAttribute(DATA);
      if (!dataPath.startsWith(ITEM))
        child.setAttribute(DATA, `${ITEM}.${dataPath}`);
    }
  }
  
  function expandTemplate(template) {
    const refId = template.getAttribute(CTE_REF);
    if (refId)
      return console.error(`No point in defining a template with a refId ${refId}`);

    let refs = template.querySelectorAll(CTE_REF_SELECTOR);
    while (refs.length) {
      const lastOne = refs.length == 1;
      const lastChild = refs[refs.length - 1];
      _expandRefTemplate(lastChild);

      if (lastOne)
        break;

      refs = template.querySelectorAll(CTE_REF_SELECTOR);
    }
  }

  function getDataPath(el) {
    const dataAttr = el.getAttribute(DATA);
    if (dataAttr.startsWith(ITEM))
      return dataAttr.substr(ITEM.length + 1);
    return dataAttr;
  }
  
  function _getObject(node) {
    if (node._ctePassed)
      return;

    let children = node.querySelectorAll(DATA_SELECTOR);

    let value;
    if (node._cteArrayElementSet || (node.hasAttribute(DATA) && !children.length)) {
      value = getElementValue(node);
    } else {
      value = {};
      for (const child of children) {
        if (child._ctePassed)
          continue;
        const object = _getObject(child);
        if (object !== UNDEFINED){
          const dataPath = getDataPath(child);
          if (dataPath)
            insertSafe(value, dataPath, object);
          else
            value = object;
        }
          
      }

      if (typeof object == 'object' && !Object.keys(value).length)
        value = UNDEFINED;
    }

    node._ctePassed = true;
    _ctePassed.push(node);
    return value;
  }

  function getObject(template) {
    for (const node of _ctePassed)
      delete node._ctePassed;
    _ctePassed.length = 0;

    const object = _getObject(template);

    for (const node of _ctePassed)
      delete node._ctePassed;
    _ctePassed.length = 0;

    return object == UNDEFINED ? undefined : object;
  }

  function putObject(template, object) {
    _putObject(template, object);
  }

  function newNode(templateId, object) {
    if (Array.isArray(object))
      return console.error('Object as array');

    const template = getTemplate(templateId);

    _putObject(template, object);

    for (const node of _ctePassed)
      delete node._ctePassed;
    _ctePassed.length = 0;

    return template;
  }

  function setGetter(name, object) {
    if (typeof name == 'object') {
      object = name;
      for (const key of Object.keys(object))
        setGetter(key, object[key]);
      return;
    }

    if (typeof object == 'function')
      return getters[name] = object;
    for (const key of Object.keys(object))
      setGetter(`${name}.${key}`, object[key]);
    return object;
  }

  function setSetter(name, object) {
    if (typeof name == 'object') {
      object = name;
      for (const key of Object.keys(object))
        setSetter(key, object[key]);
      return;
    }

    if (typeof object == 'function')
      return setters[name] = object;
    for (const key of Object.keys(object))
      setSetter(`${name}.${key}`, object[key]);
    return object;
  }

  function setTransformer(name, object) {
    if (typeof object.set == 'function')
      setters[name] = object;
    if (typeof object.get == 'function')
      getters[name] = object;
    for (const key of Object.keys(object))
      if (key != 'set' && key != 'get')
        setTransformer(`${name}.${key}`, object[key])
    return object;
  }

  function getDefaultSetter(el) {
    return settersDefault[el.tagName];
  }

  function getDefaultGetter(el) {
    return gettersDefault[el.tagName];
  }

  const lib = {
    newNode,
    getObject,
    putObject,
    setDefaultSetter(tagName, func) {
      settersDefault[tagName] = func;
    },
    getDefaultSetter,
    getDefaultGetter,
    setTransformer,
    setSetter,
    setGetter,
    getDefaultArrayGetter() {
      return getterArray;
    },
    getDefaultArraySetter() {
      return setterArray;
    },
    setVisibilityClass(className) {
      visibilityClass = className;
    }
  };

  const appScope = insertSafe(window, 'com.mental-elemental.cte', {});
  appScope.lib = lib;
  const templates = {};

  ready(() => {
    for (const template of document.querySelectorAll('template')) {
      const id = template.id;
      template.removeAttribute('id');
      template.remove();
      templates[id] = template.content.firstElementChild;
    }

    for (let div of Object.values(templates)) {
      expandTemplate(div);
    }
  });

  window.cte = lib;
})();