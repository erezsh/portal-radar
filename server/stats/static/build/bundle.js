(function (l, r) {
  if (l.getElementById("livereloadscript")) return;
  r = l.createElement("script");
  r.async = 1;
  r.src =
    "//" +
    (window.location.host || "localhost").split(":")[0] +
    ":35729/livereload.js?snipver=1";
  r.id = "livereloadscript";
  l.getElementsByTagName("head")[0].appendChild(r);
})(window.document);
var app = (function () {
  "use strict";

  function noop() {}
  function assign(tar, src) {
    // @ts-ignore
    for (const k in src) tar[k] = src[k];
    return tar;
  }
  function is_promise(value) {
    return (
      value && typeof value === "object" && typeof value.then === "function"
    );
  }
  function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
      loc: { file, line, column, char },
    };
  }
  function run(fn) {
    return fn();
  }
  function blank_object() {
    return Object.create(null);
  }
  function run_all(fns) {
    fns.forEach(run);
  }
  function is_function(thing) {
    return typeof thing === "function";
  }
  function safe_not_equal(a, b) {
    return a != a
      ? b == b
      : a !== b || (a && typeof a === "object") || typeof a === "function";
  }
  function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
      const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
      return definition[0](slot_ctx);
    }
  }
  function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
      ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
      : $$scope.ctx;
  }
  function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
      const lets = definition[2](fn(dirty));
      if ($$scope.dirty === undefined) {
        return lets;
      }
      if (typeof lets === "object") {
        const merged = [];
        const len = Math.max($$scope.dirty.length, lets.length);
        for (let i = 0; i < len; i += 1) {
          merged[i] = $$scope.dirty[i] | lets[i];
        }
        return merged;
      }
      return $$scope.dirty | lets;
    }
    return $$scope.dirty;
  }

  function append(target, node) {
    target.appendChild(node);
  }
  function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
  }
  function detach(node) {
    node.parentNode.removeChild(node);
  }
  function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
      if (iterations[i]) iterations[i].d(detaching);
    }
  }
  function element(name) {
    return document.createElement(name);
  }
  function text(data) {
    return document.createTextNode(data);
  }
  function space() {
    return text(" ");
  }
  function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
  }
  function attr(node, attribute, value) {
    if (value == null) node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
      node.setAttribute(attribute, value);
  }
  function children(element) {
    return Array.from(element.childNodes);
  }
  function custom_event(type, detail) {
    const e = document.createEvent("CustomEvent");
    e.initCustomEvent(type, false, false, detail);
    return e;
  }

  let current_component;
  function set_current_component(component) {
    current_component = component;
  }
  function get_current_component() {
    if (!current_component)
      throw new Error(`Function called outside component initialization`);
    return current_component;
  }
  function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
  }
  function afterUpdate(fn) {
    get_current_component().$$.after_update.push(fn);
  }

  const dirty_components = [];
  const binding_callbacks = [];
  const render_callbacks = [];
  const flush_callbacks = [];
  const resolved_promise = Promise.resolve();
  let update_scheduled = false;
  function schedule_update() {
    if (!update_scheduled) {
      update_scheduled = true;
      resolved_promise.then(flush);
    }
  }
  function add_render_callback(fn) {
    render_callbacks.push(fn);
  }
  let flushing = false;
  const seen_callbacks = new Set();
  function flush() {
    if (flushing) return;
    flushing = true;
    do {
      // first, call beforeUpdate functions
      // and update components
      for (let i = 0; i < dirty_components.length; i += 1) {
        const component = dirty_components[i];
        set_current_component(component);
        update(component.$$);
      }
      dirty_components.length = 0;
      while (binding_callbacks.length) binding_callbacks.pop()();
      // then, once components are updated, call
      // afterUpdate functions. This may cause
      // subsequent updates...
      for (let i = 0; i < render_callbacks.length; i += 1) {
        const callback = render_callbacks[i];
        if (!seen_callbacks.has(callback)) {
          // ...so guard against infinite loops
          seen_callbacks.add(callback);
          callback();
        }
      }
      render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
      flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
  }
  function update($$) {
    if ($$.fragment !== null) {
      $$.update();
      run_all($$.before_update);
      const dirty = $$.dirty;
      $$.dirty = [-1];
      $$.fragment && $$.fragment.p($$.ctx, dirty);
      $$.after_update.forEach(add_render_callback);
    }
  }
  const outroing = new Set();
  let outros;
  function group_outros() {
    outros = {
      r: 0,
      c: [],
      p: outros, // parent group
    };
  }
  function check_outros() {
    if (!outros.r) {
      run_all(outros.c);
    }
    outros = outros.p;
  }
  function transition_in(block, local) {
    if (block && block.i) {
      outroing.delete(block);
      block.i(local);
    }
  }
  function transition_out(block, local, detach, callback) {
    if (block && block.o) {
      if (outroing.has(block)) return;
      outroing.add(block);
      outros.c.push(() => {
        outroing.delete(block);
        if (callback) {
          if (detach) block.d(1);
          callback();
        }
      });
      block.o(local);
    }
  }

  function handle_promise(promise, info) {
    const token = (info.token = {});
    function update(type, index, key, value) {
      if (info.token !== token) return;
      info.resolved = value;
      let child_ctx = info.ctx;
      if (key !== undefined) {
        child_ctx = child_ctx.slice();
        child_ctx[key] = value;
      }
      const block = type && (info.current = type)(child_ctx);
      let needs_flush = false;
      if (info.block) {
        if (info.blocks) {
          info.blocks.forEach((block, i) => {
            if (i !== index && block) {
              group_outros();
              transition_out(block, 1, 1, () => {
                info.blocks[i] = null;
              });
              check_outros();
            }
          });
        } else {
          info.block.d(1);
        }
        block.c();
        transition_in(block, 1);
        block.m(info.mount(), info.anchor);
        needs_flush = true;
      }
      info.block = block;
      if (info.blocks) info.blocks[index] = block;
      if (needs_flush) {
        flush();
      }
    }
    if (is_promise(promise)) {
      const current_component = get_current_component();
      promise.then(
        (value) => {
          set_current_component(current_component);
          update(info.then, 1, info.value, value);
          set_current_component(null);
        },
        (error) => {
          set_current_component(current_component);
          update(info.catch, 2, info.error, error);
          set_current_component(null);
        }
      );
      // if we previously had a then/catch block, destroy it
      if (info.current !== info.pending) {
        update(info.pending, 0);
        return true;
      }
    } else {
      if (info.current !== info.then) {
        update(info.then, 1, info.value, promise);
        return true;
      }
      info.resolved = promise;
    }
  }

  const globals =
    typeof window !== "undefined"
      ? window
      : typeof globalThis !== "undefined"
      ? globalThis
      : global;
  function create_component(block) {
    block && block.c();
  }
  function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
      const new_on_destroy = on_mount.map(run).filter(is_function);
      if (on_destroy) {
        on_destroy.push(...new_on_destroy);
      } else {
        // Edge case - component was destroyed immediately,
        // most likely as a result of a binding initialising
        run_all(new_on_destroy);
      }
      component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
  }
  function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
      run_all($$.on_destroy);
      $$.fragment && $$.fragment.d(detaching);
      // TODO null out other refs, including component.$$ (but need to
      // preserve final state?)
      $$.on_destroy = $$.fragment = null;
      $$.ctx = [];
    }
  }
  function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
      dirty_components.push(component);
      schedule_update();
      component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
  }
  function init(
    component,
    options,
    instance,
    create_fragment,
    not_equal,
    props,
    dirty = [-1]
  ) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = (component.$$ = {
      fragment: null,
      ctx: null,
      // state
      props,
      update: noop,
      not_equal,
      bound: blank_object(),
      // lifecycle
      on_mount: [],
      on_destroy: [],
      before_update: [],
      after_update: [],
      context: new Map(parent_component ? parent_component.$$.context : []),
      // everything else
      callbacks: blank_object(),
      dirty,
    });
    let ready = false;
    $$.ctx = instance
      ? instance(component, prop_values, (i, ret, ...rest) => {
          const value = rest.length ? rest[0] : ret;
          if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
            if ($$.bound[i]) $$.bound[i](value);
            if (ready) make_dirty(component, i);
          }
          return ret;
        })
      : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
      if (options.hydrate) {
        const nodes = children(options.target);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        $$.fragment && $$.fragment.l(nodes);
        nodes.forEach(detach);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        $$.fragment && $$.fragment.c();
      }
      if (options.intro) transition_in(component.$$.fragment);
      mount_component(component, options.target, options.anchor);
      flush();
    }
    set_current_component(parent_component);
  }
  class SvelteComponent {
    $destroy() {
      destroy_component(this, 1);
      this.$destroy = noop;
    }
    $on(type, callback) {
      const callbacks =
        this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
      callbacks.push(callback);
      return () => {
        const index = callbacks.indexOf(callback);
        if (index !== -1) callbacks.splice(index, 1);
      };
    }
    $set() {
      // overridden by instance, if it has props
    }
  }

  function dispatch_dev(type, detail) {
    document.dispatchEvent(
      custom_event(type, Object.assign({ version: "3.22.2" }, detail))
    );
  }
  function append_dev(target, node) {
    dispatch_dev("SvelteDOMInsert", { target, node });
    append(target, node);
  }
  function insert_dev(target, node, anchor) {
    dispatch_dev("SvelteDOMInsert", { target, node, anchor });
    insert(target, node, anchor);
  }
  function detach_dev(node) {
    dispatch_dev("SvelteDOMRemove", { node });
    detach(node);
  }
  function listen_dev(
    node,
    event,
    handler,
    options,
    has_prevent_default,
    has_stop_propagation
  ) {
    const modifiers =
      options === true
        ? ["capture"]
        : options
        ? Array.from(Object.keys(options))
        : [];
    if (has_prevent_default) modifiers.push("preventDefault");
    if (has_stop_propagation) modifiers.push("stopPropagation");
    dispatch_dev("SvelteDOMAddEventListener", {
      node,
      event,
      handler,
      modifiers,
    });
    const dispose = listen(node, event, handler, options);
    return () => {
      dispatch_dev("SvelteDOMRemoveEventListener", {
        node,
        event,
        handler,
        modifiers,
      });
      dispose();
    };
  }
  function attr_dev(node, attribute, value) {
    attr(node, attribute, value);
    if (value == null)
      dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
    else dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
  }
  function set_data_dev(text, data) {
    data = "" + data;
    if (text.data === data) return;
    dispatch_dev("SvelteDOMSetData", { node: text, data });
    text.data = data;
  }
  function validate_each_argument(arg) {
    if (
      typeof arg !== "string" &&
      !(arg && typeof arg === "object" && "length" in arg)
    ) {
      let msg = "{#each} only iterates over array-like objects.";
      if (typeof Symbol === "function" && arg && Symbol.iterator in arg) {
        msg += " You can use a spread to convert this iterable into an array.";
      }
      throw new Error(msg);
    }
  }
  function validate_slots(name, slot, keys) {
    for (const slot_key of Object.keys(slot)) {
      if (!~keys.indexOf(slot_key)) {
        console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
      }
    }
  }
  class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
      if (!options || (!options.target && !options.$$inline)) {
        throw new Error(`'target' is a required option`);
      }
      super();
    }
    $destroy() {
      super.$destroy();
      this.$destroy = () => {
        console.warn(`Component was already destroyed`); // eslint-disable-line no-console
      };
    }
    $capture_state() {}
    $inject_state() {}
  }

  /*! https://github.com/leeoniya/uPlot (v1.0.8) */
  let uPlot = (function () {
    function n(n, t, e, r) {
      var i;
      e = e || 0;
      for (var a = 2147483647 >= (r = r || t.length - 1); r - e > 1; )
        n > t[(i = a ? (e + r) >> 1 : o((e + r) / 2))] ? (e = i) : (r = i);
      return n - t[e] > t[r] - n ? r : e;
    }
    function t(n, t, e, i) {
      var a = t - n,
        l = f(a || r(t) || 1),
        u = o(l),
        c = s(10, u) * e,
        v = 0 == a ? c : 0,
        h = x(
          (function (n, t) {
            return o(n / t) * t;
          })(n - v, c)
        ),
        m = x(d(t + v, c));
      return (
        i &&
          (0 == a
            ? t > 0
              ? ((h = 0), (m = 2 * t))
              : 0 > t && ((m = 0), (h = 2 * n))
            : (c > m - t && (m += c),
              c > n - h && (h -= c),
              n >= 0 && 0 > h && (h = 0),
              0 >= t && m > 0 && (m = 0))),
        [h, m]
      );
    }
    var e = Math,
      r = e.abs,
      o = e.floor,
      i = e.round,
      a = e.ceil,
      l = e.min,
      u = e.max,
      s = e.pow,
      f = e.log10,
      c = e.PI;
    function v(n, t) {
      return i(n / t) * t;
    }
    function h(n, t, e) {
      return l(u(n, t), e);
    }
    function m(n) {
      return "function" == typeof n
        ? n
        : function () {
            return n;
          };
    }
    function p(n, t) {
      return t;
    }
    function d(n, t) {
      return a(n / t) * t;
    }
    function g(n) {
      return i(1e3 * n) / 1e3;
    }
    function x(n) {
      return i(1e6 * n) / 1e6;
    }
    var w = Array.isArray;
    function b(n) {
      return "object" == typeof n && null !== n;
    }
    function y(n) {
      var t;
      if (w(n)) t = n.map(y);
      else if (b(n)) for (var e in ((t = {}), n)) t[e] = y(n[e]);
      else t = n;
      return t;
    }
    function M(n) {
      for (var t = arguments, e = 1; t.length > e; e++) {
        var r = t[e];
        for (var o in r) b(n[o]) ? M(n[o], y(r[o])) : (n[o] = y(r[o]));
      }
      return n;
    }
    var k = "width",
      S = "height",
      Y = "left",
      D = requestAnimationFrame,
      E = document,
      T = window,
      W = devicePixelRatio;
    function z(n, t) {
      null != t && n.classList.add(t);
    }
    function A(n, t, e) {
      n.style[t] = e + "px";
    }
    function F(n, t, e, r) {
      var o = E.createElement(n);
      return null != t && z(o, t), null != e && e.insertBefore(o, r), o;
    }
    function C(n, t) {
      return F("div", n, t);
    }
    function _(n, t, e) {
      n.style.transform = "translate(" + t + "px," + e + "px)";
    }
    var H = { passive: !0 };
    function P(n, t, e) {
      t.addEventListener(n, e, H);
    }
    function N(n, t, e) {
      t.removeEventListener(n, e, H);
    }
    var L = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
      B = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
    function I(n) {
      return n.slice(0, 3);
    }
    var R = B.map(I),
      j = L.map(I),
      G = { MMMM: L, MMM: j, WWWW: B, WWW: R };
    function J(n) {
      return (10 > n ? "0" : "") + n;
    }
    var U = {
      YYYY: function (n) {
        return n.getFullYear();
      },
      YY: function (n) {
        return (n.getFullYear() + "").slice(2);
      },
      MMMM: function (n, t) {
        return t.MMMM[n.getMonth()];
      },
      MMM: function (n, t) {
        return t.MMM[n.getMonth()];
      },
      MM: function (n) {
        return J(n.getMonth() + 1);
      },
      M: function (n) {
        return n.getMonth() + 1;
      },
      DD: function (n) {
        return J(n.getDate());
      },
      D: function (n) {
        return n.getDate();
      },
      WWWW: function (n, t) {
        return t.WWWW[n.getDay()];
      },
      WWW: function (n, t) {
        return t.WWW[n.getDay()];
      },
      HH: function (n) {
        return J(n.getHours());
      },
      H: function (n) {
        return n.getHours();
      },
      h: function (n) {
        var t = n.getHours();
        return 0 == t ? 12 : t > 12 ? t - 12 : t;
      },
      AA: function (n) {
        return 12 > n.getHours() ? "AM" : "PM";
      },
      aa: function (n) {
        return 12 > n.getHours() ? "am" : "pm";
      },
      a: function (n) {
        return 12 > n.getHours() ? "a" : "p";
      },
      mm: function (n) {
        return J(n.getMinutes());
      },
      m: function (n) {
        return n.getMinutes();
      },
      ss: function (n) {
        return J(n.getSeconds());
      },
      s: function (n) {
        return n.getSeconds();
      },
      fff: function (n) {
        return (function (n) {
          return (10 > n ? "00" : 100 > n ? "0" : "") + n;
        })(n.getMilliseconds());
      },
    };
    function V(n, t) {
      t = t || G;
      for (var e, r = [], o = /\{([a-z]+)\}|[^{]+/gi; (e = o.exec(n)); )
        r.push("{" == e[0][0] ? U[e[1]] : e[0]);
      return function (n) {
        for (var e = "", o = 0; r.length > o; o++)
          e += "string" == typeof r[o] ? r[o] : r[o](n, t);
        return e;
      };
    }
    function O(n, t, e) {
      for (var o = [], i = n; t > i; i++)
        for (var a = 0; e.length > a; a++) {
          var l = e[a] * s(10, i);
          o.push(+l.toFixed(r(i)));
        }
      return o;
    }
    var q = [1, 2, 5],
      X = O(-12, 0, q),
      Z = O(0, 12, q),
      K = X.concat(Z),
      Q = 3600,
      $ = 86400,
      nn = 30 * $,
      tn = 365 * $,
      en = [5e-4].concat(O(-3, 0, q), [
        1,
        5,
        10,
        15,
        30,
        60,
        300,
        600,
        900,
        1800,
        Q,
        7200,
        3 * Q,
        4 * Q,
        6 * Q,
        8 * Q,
        43200,
        $,
        2 * $,
        3 * $,
        4 * $,
        5 * $,
        6 * $,
        7 * $,
        8 * $,
        9 * $,
        10 * $,
        15 * $,
        nn,
        2 * nn,
        3 * nn,
        4 * nn,
        6 * nn,
        tn,
        2 * tn,
        5 * tn,
        10 * tn,
        25 * tn,
        50 * tn,
        100 * tn,
      ]);
    function rn(n, t) {
      return n.map(function (n) {
        return [n[0], t(n[1]), n[2], t(n[4] ? n[1] + n[3] : n[3])];
      });
    }
    var on = "{M}/{D}",
      an = "\n" + on,
      ln = "{h}:{mm}{aa}",
      un = [
        [tn, "{YYYY}", 7, "", 1],
        [28 * $, "{MMM}", 7, "\n{YYYY}", 1],
        [$, on, 7, "\n{YYYY}", 1],
        [Q, "{h}{aa}", 4, an, 1],
        [60, ln, 4, an, 1],
        [1, ":{ss}", 2, an + " " + ln, 1],
        [0.001, ":{ss}.{fff}", 2, an + " " + ln, 1],
      ];
    function sn(n, t) {
      return function (e, r) {
        var o = g(r[1] - r[0]),
          i = t.find(function (n) {
            return o >= n[0];
          }),
          a = null,
          l = null,
          u = null;
        return r.map(function (t) {
          var e = n(t),
            r = e.getFullYear(),
            o = e.getDate(),
            s = e.getMinutes(),
            f = r != a,
            c = o != l,
            v = s != u;
          return (
            (a = r),
            (l = o),
            (u = s),
            ((7 == i[2] && f) || (4 == i[2] && c) || (2 == i[2] && v)
              ? i[3]
              : i[1])(e)
          );
        });
      };
    }
    function fn(n, t, e) {
      return new Date(n, t, e);
    }
    function cn(n, t) {
      return t(n);
    }
    function vn(n, t) {
      return function (e, r) {
        return t(n(r));
      };
    }
    var hn = {
        show: !0,
        x: !0,
        y: !0,
        lock: !1,
        points: {
          show: function (n, t) {
            var e = n.series[t],
              r = C();
            r.style.background = e.stroke || "#000";
            var o = Yn(e.width, 1),
              i = (o - 1) / -2;
            return (
              A(r, k, o),
              A(r, S, o),
              A(r, "marginLeft", i),
              A(r, "marginTop", i),
              r
            );
          },
        },
        drag: { setScale: !0, x: !0, y: !1 },
        focus: { prox: -1 },
        locked: !1,
        left: -10,
        top: -10,
        idx: null,
      },
      mn = { show: !0, stroke: "rgba(0,0,0,0.07)", width: 2 },
      pn = M({}, mn, { size: 10 }),
      dn =
        '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
      gn = "bold " + dn,
      xn = {
        type: "x",
        show: !0,
        scale: "x",
        space: 50,
        gap: 5,
        size: 50,
        labelSize: 30,
        labelFont: gn,
        side: 2,
        grid: mn,
        ticks: pn,
        font: dn,
        rotate: 0,
      },
      wn = { show: !0, scale: "x", min: 1 / 0, max: -1 / 0, idxs: [] },
      bn = new Intl.NumberFormat(navigator.language);
    function yn(n, t) {
      return t.map(bn.format);
    }
    function Mn(n, t, e, r, o, i) {
      for (
        var a = [], l = (t = i ? t : +d(t, r).toFixed(12));
        e >= l;
        l = +(l + r).toFixed(12)
      )
        a.push(l);
      return a;
    }
    function kn(n, t) {
      return t;
    }
    var Sn = {
      type: "y",
      show: !0,
      scale: "y",
      space: 40,
      gap: 5,
      size: 50,
      labelSize: 30,
      labelFont: gn,
      side: 3,
      grid: mn,
      ticks: pn,
      font: dn,
      rotate: 0,
    };
    function Yn(n, t) {
      return u(g(5 * t), 2 * g(n * t) - 1);
    }
    var Dn = {
        scale: "y",
        show: !0,
        band: !1,
        alpha: 1,
        points: {
          show: function (n, t) {
            var e = Yn(n.series[t].width, W),
              r = n.series[0].idxs;
            return n.bbox.width / e / 2 >= r[1] - r[0];
          },
        },
        values: null,
        min: 1 / 0,
        max: -1 / 0,
        idxs: [],
        path: null,
        clip: null,
      },
      En = { time: !0, auto: !1, distr: 1, min: 1 / 0, max: -1 / 0 },
      Tn = M({}, En, { time: !1, auto: !0 }),
      Wn = {};
    function zn() {
      var n = [];
      return {
        sub: function (t) {
          n.push(t);
        },
        unsub: function (t) {
          n = n.filter(function (n) {
            return n != t;
          });
        },
        pub: function (t, e, r, o, i, a, l) {
          n.length > 1 &&
            n.forEach(function (n) {
              n != e && n.pub(t, e, r, o, i, a, l);
            });
        },
      };
    }
    function An(n, t, e) {
      return [n[0], n[1]].concat(n.slice(2)).map(function (n, r) {
        return Fn(n, r, t, e);
      });
    }
    function Fn(n, t, e, r) {
      return M({}, 0 == t || (n && n.side % 2 == 0) ? e : r, n);
    }
    function Cn(n, t, e, r) {
      return r + (1 - (n - t.min) / (t.max - t.min)) * e;
    }
    function _n(n, t, e, r) {
      return r + ((n - t.min) / (t.max - t.min)) * e;
    }
    function Hn(n, t, e) {
      return [t, e > t ? e : e + 86400];
    }
    function Pn(n, t, e) {
      var i = e - t;
      if (0 == i) {
        var a = f(i || r(e) || 1),
          l = o(a) + 1;
        return [t, d(e, s(10, l))];
      }
      return [t, e];
    }
    function Nn(n, e, r) {
      return t(e, r, 0.2, !0);
    }
    function Ln(n) {
      return 0 == n.button;
    }
    function Bn(n) {
      var t;
      return [
        (n = n.replace(/\d+/, function (n) {
          return (t = i(n * W));
        })),
        t,
      ];
    }
    function In(t, e, a) {
      var s = {},
        f = (s.root = C("uplot"));
      null != t.id && (f.id = t.id),
        z(f, t.class),
        t.title && (C("title", f).textContent = t.title);
      var b = F("canvas"),
        H = (s.ctx = b.getContext("2d")),
        L = C("wrap", f),
        B = C("under", L);
      L.appendChild(b);
      var I = C("over", L);
      ((t = y(t)).plugins || []).forEach(function (n) {
        n.opts && (t = n.opts(s, t) || t);
      });
      var R = !1,
        j = An(t.series, wn, Dn),
        G = An(t.axes || [], xn, Sn),
        J = (t.scales = t.scales || {}),
        U = M({ x: i(Sn.size / 2), y: i(xn.size / 3) }, t.gutters),
        O =
          t.tzDate ||
          function (n) {
            return new Date(1e3 * n);
          },
        q = t.fmtDate || V,
        X = (function (n) {
          return function (t, e, r, i, a) {
            var l = [],
              u = i >= nn && tn > i,
              s = n(e),
              f = s / 1e3,
              c = fn(s.getFullYear(), s.getMonth(), u ? 1 : s.getDate()),
              v = c / 1e3;
            if (u)
              for (
                var h = i / nn,
                  m =
                    f == v ? f : fn(c.getFullYear(), c.getMonth() + h, 1) / 1e3,
                  p = new Date(1e3 * m),
                  w = p.getFullYear(),
                  b = p.getMonth(),
                  y = 0;
                r >= m;
                y++
              ) {
                var M = fn(w, b + h * y, 1);
                (m = (+M + (M - n(M / 1e3))) / 1e3) > r || l.push(m);
              }
            else {
              var k = $ > i ? i : $,
                S = v + (o(e) - o(f)) + d(f - v, k);
              l.push(S);
              for (
                var Y = n(S),
                  D = Y.getHours() + Y.getMinutes() / 60 + Y.getSeconds() / Q,
                  E = i / Q;
                ;

              ) {
                S = g(S + i);
                var T = o(x(D + E)) % 24,
                  W = n(S).getHours() - T;
                if ((W > 1 && (W = -1), (S -= W * Q) > r)) break;
                (D = (D + E) % 24),
                  0.7 > g((S - l[l.length - 1]) / i) * a || l.push(S);
              }
            }
            return l;
          };
        })(O),
        on = sn(O, rn(un, q)),
        an = vn(O, cn("{YYYY}-{MM}-{DD} {h}:{mm}{aa}", q));
      (s.series = j), (s.axes = G), (s.scales = J);
      var ln = {};
      for (var mn in J) {
        var pn = J[mn];
        (null == pn.min && null == pn.max) ||
          (ln[mn] = { min: pn.min, max: pn.max });
      }
      var dn,
        gn,
        bn = M({ show: !0 }, t.legend).show,
        In = [],
        Rn = !1;
      if (bn) {
        dn = F("table", "legend", f);
        var jn = j[1].values;
        if ((Rn = null != jn)) {
          var Gn = F("tr", "labels", dn);
          for (var Jn in (F("th", null, Gn), (gn = jn(s, 1, 0))))
            F("th", null, Gn).textContent = Jn;
        } else (gn = { _: 0 }), z(dn, "inline");
      }
      var Un = (s.cursor = M({}, hn, t.cursor));
      Un.points.show = m(Un.points.show);
      var Vn = (s.focus = M({}, t.focus || { alpha: 0.3 }, Un.focus)),
        On = Vn.prox >= 0,
        qn = [null];
      function Xn(n, t) {
        var e = n.scale,
          r = (J[e] = M({}, 0 == t ? En : Tn, J[e])),
          o = r.time;
        (r.range = m(r.range || (o ? Hn : 0 == t ? Pn : Nn))),
          (n.spanGaps = !0 === n.spanGaps ? p : m(n.spanGaps || []));
        var i = n.value;
        if (
          ((n.value = o
            ? (function (n) {
                return "string" == typeof n;
              })(i)
              ? vn(O, cn(i, q))
              : i || an
            : i || kn),
          (n.label = n.label || (o ? "Time" : "Value")),
          t > 0)
        ) {
          (n.width = null == n.width ? 1 : n.width), (n.paths = n.paths || Wt);
          var a = Yn(n.width, 1);
          (n.points = M({}, { size: a, width: u(1, 0.2 * a) }, n.points)),
            (n.points.show = m(n.points.show)),
            (n._paths = null);
        }
        if (
          (bn &&
            In.splice(
              t,
              0,
              (function (n, t) {
                if (0 == t && Rn) return null;
                var e = [],
                  r = F("tr", "series", dn, dn.childNodes[t]);
                z(r, n.class), n.show || z(r, "off");
                var o = F("th", null, r),
                  i = C("ident", o);
                n.width && (i.style.borderColor = n.stroke),
                  (i.style.backgroundColor = n.fill);
                var a = C("text", o);
                for (var l in ((a.textContent = n.label),
                t > 0 &&
                  (P("click", o, function (t) {
                    Un.locked ||
                      (Ln(t) &&
                        Gt(j.indexOf(n), { show: !n.show }, pe.setSeries));
                  }),
                  On &&
                    P("mouseenter", o, function () {
                      Un.locked ||
                        Gt(j.indexOf(n), { focus: !0 }, pe.setSeries);
                    })),
                gn)) {
                  var u = F("td", null, r);
                  (u.textContent = "--"), e.push(u);
                }
                return e;
              })(n, t)
            ),
          Un.show)
        ) {
          var l = (function (n, t) {
            if (t > 0) {
              var e = Un.points.show(s, t);
              if (e)
                return (
                  z(e, "cursor-pt"),
                  z(e, n.class),
                  _(e, -10, -10),
                  I.insertBefore(e, qn[t]),
                  e
                );
            }
          })(n, t);
          l && qn.splice(t, 0, l);
        }
      }
      for (var Zn in ((s.addSeries = function (n, t) {
        (n = Fn(n, (t = null == t ? j.length : t), wn, Dn)),
          j.splice(t, 0, n),
          Xn(j[t], t);
      }),
      (s.delSeries = function (n) {
        j.splice(n, 1),
          In.splice(n, 1)[0][0].parentNode.remove(),
          qn.splice(n, 1)[0].remove();
      }),
      j.forEach(Xn),
      J)) {
        var Kn = J[Zn];
        null != Kn.from && (J[Zn] = M({}, J[Kn.from], Kn));
      }
      var Qn,
        $n = j[0].scale,
        nt = J[$n].distr;
      G.forEach(function (n) {
        if (n.show) {
          var t = J[n.scale];
          null == t &&
            ((n.scale = n.side % 2 ? j[1].scale : $n), (t = J[n.scale]));
          var e = t.time;
          (n.space = m(n.space)),
            (n.rotate = m(n.rotate)),
            (n.incrs = m(n.incrs || (2 == t.distr ? Z : e ? en : K))),
            (n.split = m(n.split || (e && 1 == t.distr ? X : Mn)));
          var r = n.values;
          (n.values = e ? (w(r) ? sn(O, rn(r, q)) : r || on) : r || yn),
            (n.font = Bn(n.font)),
            (n.labelFont = Bn(n.labelFont));
        }
      });
      var tt,
        et,
        rt,
        ot,
        it,
        at,
        lt,
        ut,
        st,
        ft,
        ct = null,
        vt = null,
        ht = j[0].idxs,
        mt = null;
      function pt(n, t) {
        (s.data = n),
          (e = n.slice()),
          (Qn = (mt = e[0]).length),
          2 == nt &&
            (e[0] = mt.map(function (n, t) {
              return t;
            })),
          Ft(),
          me("setData"),
          !1 !== t && dt();
      }
      function dt() {
        (ct = ht[0] = 0),
          (vt = ht[1] = Qn - 1),
          jt($n, 2 == nt ? ct : e[0][ct], 2 == nt ? vt : e[0][vt]);
      }
      function gt(n, t, e, r) {
        (H.strokeStyle = n || "#000"),
          (H.lineWidth = t),
          (H.lineJoin = "round"),
          H.setLineDash(e || []),
          (H.fillStyle = r || "#000");
      }
      function xt(n, t) {
        (s.width = tt = rt = n),
          (s.height = et = ot = t),
          (it = at = 0),
          (function () {
            var n = !1,
              t = !1,
              e = !1,
              r = !1;
            G.forEach(function (o) {
              if (o.show) {
                var i = o.side,
                  a = i % 2,
                  l =
                    o.size +
                    (o.labelSize = null != o.label ? o.labelSize || 30 : 0);
                l > 0 &&
                  (a
                    ? ((rt -= l), 3 == i ? ((it += l), (r = !0)) : (e = !0))
                    : ((ot -= l), 0 == i ? ((at += l), (n = !0)) : (t = !0)));
              }
            }),
              (n || t) && (e || (rt -= U.x), r || ((rt -= U.x), (it += U.x))),
              (r || e) && (t || (ot -= U.y), n || ((ot -= U.y), (at += U.y)));
          })(),
          (function () {
            var n = it + rt,
              t = at + ot,
              e = it,
              r = at;
            function o(o, i) {
              switch (o) {
                case 1:
                  return (n += i) - i;
                case 2:
                  return (t += i) - i;
                case 3:
                  return (e -= i) + i;
                case 0:
                  return (r -= i) + i;
              }
            }
            G.forEach(function (n) {
              var t = n.side;
              (n._pos = o(t, n.size)),
                null != n.label && (n._lpos = o(t, n.labelSize));
            });
          })();
        var e = s.bbox;
        (lt = e[Y] = v(it * W, 0.5)),
          (ut = e.top = v(at * W, 0.5)),
          (st = e[k] = v(rt * W, 0.5)),
          (ft = e[S] = v(ot * W, 0.5)),
          A(B, Y, it),
          A(B, "top", at),
          A(B, k, rt),
          A(B, S, ot),
          A(I, Y, it),
          A(I, "top", at),
          A(I, k, rt),
          A(I, S, ot),
          A(L, k, tt),
          A(L, S, et),
          (b[k] = i(tt * W)),
          (b[S] = i(et * W)),
          re(),
          R && jt($n, J[$n].min, J[$n].max),
          R && me("setSize");
      }
      function wt() {
        if (Xt) Kt = !0;
        else {
          if (Qn > 0) {
            var t = y(J);
            for (var r in t) {
              var o = t[r],
                i = ln[r];
              null != i
                ? (M(o, i), r == $n && Ft())
                : r != $n && ((o.min = 1 / 0), (o.max = -1 / 0));
            }
            for (var a in (j.forEach(function (r, o) {
              var i = r.scale,
                a = t[i];
              if (0 == o) {
                var f = a.range(s, a.min, a.max);
                (a.min = f[0]),
                  (a.max = f[1]),
                  (ct = n(a.min, e[0])),
                  (vt = n(a.max, e[0])),
                  a.min > e[0][ct] && ct++,
                  e[0][vt] > a.max && vt--,
                  (r.min = mt[ct]),
                  (r.max = mt[vt]);
              } else if (r.show && null == ln[i]) {
                var c =
                  r.min == 1 / 0
                    ? a.auto
                      ? (function (n, t, e) {
                          for (var r = 1 / 0, o = -1 / 0, i = t; e >= i; i++)
                            null != n[i] &&
                              ((r = l(r, n[i])), (o = u(o, n[i])));
                          return [r, o];
                        })(e[o], ct, vt)
                      : [0, 100]
                    : [r.min, r.max];
                (a.min = l(a.min, (r.min = c[0]))),
                  (a.max = u(a.max, (r.max = c[1])));
              }
              (r.idxs[0] = ct), (r.idxs[1] = vt);
            }),
            t)) {
              var f = t[a];
              if (null == f.from && f.min != 1 / 0 && null == ln[a]) {
                var c = f.range(s, f.min, f.max);
                (f.min = c[0]), (f.max = c[1]);
              }
            }
            for (var v in t) {
              var h = t[v];
              if (null != h.from) {
                var m = t[h.from];
                if (m.min != 1 / 0) {
                  var p = h.range(s, m.min, m.max);
                  (h.min = p[0]), (h.max = p[1]);
                }
              }
            }
            var d = {};
            for (var g in t) {
              var x = t[g],
                w = J[g];
              (w.min == x.min && w.max == x.max) ||
                ((w.min = x.min), (w.max = x.max), (d[g] = !0)),
                (ln[g] = null);
            }
            for (var b in (j.forEach(function (n) {
              d[n.scale] && (n._paths = null);
            }),
            d))
              me("setScale", b);
          }
          Un.show && te();
        }
      }
      (s.setData = pt),
        (s.bbox = {}),
        (s.setSize = function (n) {
          xt(n.width, n.height);
        });
      var bt,
        yt,
        Mt,
        kt,
        St,
        Yt,
        Dt,
        Et = 1;
      function Tt(n, t) {
        var e = new Set(j[n].spanGaps(s, t, n)),
          r = null;
        if (
          (t = t.filter(function (n) {
            return !e.has(n);
          })).length > 0
        ) {
          r = new Path2D();
          for (var o = lt, i = 0; t.length > i; i++) {
            var a = t[i];
            r.rect(o, ut, a[0] - o, ut + ft), (o = a[1]);
          }
          r.rect(o, ut, lt + st - o, ut + ft);
        }
        return r;
      }
      function Wt(n, t, r, o) {
        var a,
          s,
          f = j[t],
          c = e[0],
          v = e[t],
          h = J[$n],
          m = J[f.scale],
          p =
            1 == Et
              ? { stroke: new Path2D(), fill: null, clip: null }
              : j[t - 1]._paths,
          d = p.stroke,
          x = g(f[k] * W),
          w = 1 / 0,
          b = -1 / 0,
          y = [],
          M = i(_n(c[1 == Et ? r : o], h, st, lt));
        f.band &&
          1 == Et &&
          r == ct &&
          (x && d.lineTo(-x, i(Cn(v[r], m, ft, ut))),
          c[0] > h.min && y.push([lt, M - 1]));
        for (var S = 1 == Et ? r : o; S >= r && o >= S; S += Et) {
          var Y = i(_n(c[S], h, st, lt));
          if (Y == M)
            null != v[S] &&
              ((a = i(Cn(v[S], m, ft, ut))), (w = l(a, w)), (b = u(a, b)));
          else {
            var D = !1;
            if (
              (w != 1 / 0
                ? (d.lineTo(M, w), d.lineTo(M, b), d.lineTo(M, a), (s = M))
                : (D = !0),
              null != v[S]
                ? ((a = i(Cn(v[S], m, ft, ut))),
                  d.lineTo(Y, a),
                  (w = b = a),
                  Y - M > 1 && null == v[S - 1] && (D = !0))
                : ((w = 1 / 0), (b = -1 / 0)),
              D)
            ) {
              var E = y[y.length - 1];
              E && E[0] == s ? (E[1] = Y) : y.push([s, Y]);
            }
            M = Y;
          }
        }
        if (f.band) {
          var T,
            z,
            A = 100 * x;
          -1 == Et && r == ct && ((z = lt - A), (T = r)),
            1 == Et &&
              o == vt &&
              ((z = lt + st + A),
              (T = o),
              h.max > c[Qn - 1] && y.push([M, lt + st])),
            d.lineTo(z, i(Cn(v[T], m, ft, ut)));
        }
        if (1 == Et && ((p.clip = Tt(t, y)), null != f.fill)) {
          var F = (p.fill = new Path2D(d)),
            C = i(Cn(0, m, ft, ut));
          F.lineTo(lt + st, C), F.lineTo(lt, C);
        }
        return f.band && (Et *= -1), p;
      }
      function zt(n, t, e, r) {
        var o;
        if (r > 0) {
          var i = n.space(s, t, e, r);
          (o = (function (n, t, e, r) {
            for (var o = e / n, i = 0; t.length > i; i++) {
              var a = t[i] * o;
              if (a >= r) return [t[i], a];
            }
          })(e - t, n.incrs(s, t, e, r, i), r, i)).push(o[1] / i);
        } else o = [0, 0];
        return o;
      }
      function At(n, t, e, r, o, i, a, l) {
        var u = (i % 2) / 2;
        H.translate(u, u), gt(a, i, l), H.beginPath();
        var s,
          f,
          c,
          v,
          h = r + (0 == e || 3 == e ? -o : o);
        0 == t ? ((f = r), (v = h)) : ((s = r), (c = h)),
          n.forEach(function (n) {
            0 == t ? (s = c = n) : (f = v = n), H.moveTo(s, f), H.lineTo(c, v);
          }),
          H.stroke(),
          H.translate(-u, -u);
      }
      function Ft() {
        j.forEach(function (n, t) {
          t > 0 && ((n.min = 1 / 0), (n.max = -1 / 0), (n._paths = null));
        });
      }
      function Ct() {
        Xt
          ? (Zt = !0)
          : (H.clearRect(0, 0, b[k], b[S]),
            me("drawClear"),
            (function () {
              G.forEach(function (n) {
                if (n.show) {
                  var t = J[n.scale];
                  if (t.min != 1 / 0) {
                    var e = n.side,
                      r = e % 2,
                      o = t.min,
                      a = t.max,
                      l = zt(n, o, a, 0 == r ? rt : ot),
                      u = l[1],
                      f = n.split(s, o, a, l[0], l[2], 2 == t.distr),
                      v = 0 == r ? _n : Cn,
                      h = 0 == r ? st : ft,
                      m = 0 == r ? lt : ut,
                      p = f.map(function (n) {
                        return i(v(n, t, h, m));
                      }),
                      d = i(n.gap * W),
                      x = n.ticks,
                      w = x.show ? i(x.size * W) : 0,
                      b = n.values(
                        s,
                        2 == t.distr
                          ? f.map(function (n) {
                              return mt[n];
                            })
                          : f,
                        u
                      ),
                      y = 2 == e ? (n.rotate(s, b, u) * -c) / 180 : 0,
                      M = i(n._pos * W),
                      S =
                        M +
                        (w + d) *
                          ((0 == r && 0 == e) || (1 == r && 3 == e) ? -1 : 1),
                      D = 0 == r ? S : 0,
                      E = 1 == r ? S : 0;
                    (H.font = n.font[0]),
                      (H.fillStyle = n.stroke || "#000"),
                      (H.textAlign =
                        y > 0
                          ? Y
                          : 0 > y
                          ? "right"
                          : 0 == r
                          ? "center"
                          : 3 == e
                          ? "right"
                          : Y),
                      (H.textBaseline =
                        y || 1 == r ? "middle" : 2 == e ? "top" : "bottom");
                    var T = 1.5 * n.font[1];
                    if (
                      (b.forEach(function (n, t) {
                        0 == r ? (E = p[t]) : (D = p[t]),
                          ("" + n).split(/\n/gm).forEach(function (n, t) {
                            y
                              ? (H.save(),
                                H.translate(E, D + t * T),
                                H.rotate(y),
                                H.fillText(n, 0, 0),
                                H.restore())
                              : H.fillText(n, E, D + t * T);
                          });
                      }),
                      n.label)
                    ) {
                      H.save();
                      var z = i(n._lpos * W);
                      1 == r
                        ? ((E = D = 0),
                          H.translate(z, i(ut + ft / 2)),
                          H.rotate((3 == e ? -c : c) / 2))
                        : ((E = i(lt + st / 2)), (D = z)),
                        (H.font = n.labelFont[0]),
                        (H.textAlign = "center"),
                        (H.textBaseline = 2 == e ? "top" : "bottom"),
                        H.fillText(n.label, E, D),
                        H.restore();
                    }
                    x.show && At(p, r, e, M, w, g(x[k] * W), x.stroke);
                    var A = n.grid;
                    A.show &&
                      At(
                        p,
                        r,
                        0 == r ? 2 : 1,
                        0 == r ? ut : lt,
                        0 == r ? ft : st,
                        g(A[k] * W),
                        A.stroke,
                        A.dash
                      );
                  }
                }
              }),
                me("drawAxes");
            })(),
            (function () {
              j.forEach(function (n, t) {
                if (t > 0 && n.show && null == n._paths) {
                  var r = (function (n) {
                    for (
                      var t = h(ct - 1, 0, Qn - 1), e = h(vt + 1, 0, Qn - 1);
                      null == n[t] && t > 0;

                    )
                      t--;
                    for (; null == n[e] && Qn - 1 > e; ) e++;
                    return [t, e];
                  })(e[t]);
                  n._paths = n.paths(s, t, r[0], r[1]);
                }
              }),
                j.forEach(function (n, t) {
                  t > 0 &&
                    n.show &&
                    (n._paths &&
                      (function (n) {
                        var t = j[n];
                        if (1 == Et) {
                          var e = t._paths,
                            r = e.stroke,
                            o = e.fill,
                            i = e.clip,
                            a = g(t[k] * W),
                            l = (a % 2) / 2;
                          gt(t.stroke, a, t.dash, t.fill),
                            (H.globalAlpha = t.alpha),
                            H.translate(l, l),
                            H.save();
                          var u = lt,
                            s = ut,
                            f = st,
                            c = ft,
                            v = (a * W) / 2;
                          0 == t.min && (c += v),
                            0 == t.max && ((s -= v), (c += v)),
                            H.beginPath(),
                            H.rect(u, s, f, c),
                            H.clip(),
                            null != i && H.clip(i),
                            t.band
                              ? (H.fill(r), a && H.stroke(r))
                              : (a && H.stroke(r), null != t.fill && H.fill(o)),
                            H.restore(),
                            H.translate(-l, -l),
                            (H.globalAlpha = 1);
                        }
                        t.band && (Et *= -1);
                      })(t),
                    n.points.show(s, t, ct, vt) &&
                      (function (n) {
                        var t = j[n],
                          r = t.points,
                          o = g(t[k] * W),
                          a = (o % 2) / 2,
                          l = r.width > 0,
                          u = ((r.size - r.width) / 2) * W,
                          s = g(2 * u);
                        H.translate(a, a),
                          H.save(),
                          H.beginPath(),
                          H.rect(lt - s, ut - s, st + 2 * s, ft + 2 * s),
                          H.clip(),
                          (H.globalAlpha = t.alpha);
                        for (var f = new Path2D(), v = ct; vt >= v; v++)
                          if (null != e[n][v]) {
                            var h = i(_n(e[0][v], J[$n], st, lt)),
                              m = i(Cn(e[n][v], J[t.scale], ft, ut));
                            f.moveTo(h + u, m), f.arc(h, m, u, 0, 2 * c);
                          }
                        gt(
                          r.stroke || t.stroke || "#000",
                          o,
                          null,
                          r.fill || (l ? "#fff" : t.stroke || "#000")
                        ),
                          H.fill(f),
                          l && H.stroke(f),
                          (H.globalAlpha = 1),
                          H.restore(),
                          H.translate(-a, -a);
                      })(t),
                    me("drawSeries", t));
                });
            })(),
            (bt = !0),
            me("draw"));
      }
      function _t(n, t) {
        var e = J[n];
        if (null == e.from) {
          if (
            n == $n &&
            e.time &&
            G[0].show &&
            t.max > t.min &&
            0.001 > zt(G[0], t.min, t.max, rt)[0]
          )
            return;
          (ln[n] = t), (bt = !1), wt(), !bt && Ct(), (bt = !1);
        }
      }
      (s.redraw = function (n) {
        !1 !== n ? jt($n, J[$n].min, J[$n].max) : Ct();
      }),
        (s.setScale = _t);
      var Ht = !1,
        Pt = Un.drag;
      if (Un.show) {
        var Nt = "cursor-";
        Un.x && ((Yt = Un.left), (yt = C(Nt + "x", I))),
          Un.y && ((Dt = Un.top), (Mt = C(Nt + "y", I)));
      }
      var Lt = (s.select = M(
          { show: !0, left: 0, width: 0, top: 0, height: 0 },
          t.select
        )),
        Bt = Lt.show ? C("select", I) : null;
      function It(n, t) {
        if (Lt.show) {
          for (var e in n) A(Bt, e, (Lt[e] = n[e]));
          !1 !== t && me("setSelect");
        }
      }
      function Rt(n) {
        var t = bn ? In[n][0].parentNode : null;
        j[n].show
          ? t &&
            (function (n) {
              n.classList.remove("off");
            })(t)
          : (t && z(t, "off"), qn.length > 1 && _(qn[n], 0, -10));
      }
      function jt(n, t, e) {
        _t(n, { min: t, max: e });
      }
      function Gt(n, t, e) {
        var r = j[n];
        if (
          (null != t.focus &&
            (function (n) {
              n != Vt &&
                (j.forEach(function (t, e) {
                  !(function (n, t) {
                    var e = j[n];
                    Jt(n, t), e.band && Jt(j[n + 1].band ? n + 1 : n - 1, t);
                  })(e, null == n || 0 == e || e == n ? 1 : Vn.alpha);
                }),
                (Vt = n),
                Ct());
            })(n),
          null != t.show)
        ) {
          if (((r.show = t.show), Rt(n), r.band)) {
            var o = j[n + 1] && j[n + 1].band ? n + 1 : n - 1;
            (j[o].show = r.show), Rt(o);
          }
          jt($n, J[$n].min, J[$n].max);
        }
        me("setSeries", n, t), e && ge.pub("setSeries", s, n, t);
      }
      function Jt(n, t) {
        (j[n].alpha = t), In && (In[n][0].parentNode.style.opacity = t);
      }
      (s.setSelect = It), (s.setSeries = Gt);
      var Ut = Array(j.length),
        Vt = null;
      function Ot(n, t) {
        var e = h(n / (t == $n ? rt : ot), 0, 1),
          r = J[t];
        return r.min + e * (r.max - r.min);
      }
      function qt(t) {
        return n(Ot(t, $n), e[0], ct, vt);
      }
      bn &&
        On &&
        P("mouseleave", dn, function () {
          Un.locked || (Gt(null, { focus: !1 }, pe.setSeries), te());
        }),
        (s.posToIdx = qt),
        (s.posToVal = function (n, t) {
          return Ot(t == $n ? n : ot - n, t);
        }),
        (s.valToPos = function (n, t, e) {
          return t == $n
            ? _n(n, J[t], e ? st : rt, e ? lt : 0)
            : Cn(n, J[t], e ? ft : ot, e ? ut : 0);
        });
      var Xt = !1,
        Zt = !1,
        Kt = !1,
        Qt = !1;
      function $t(n) {
        (Xt = !0),
          n(s),
          (Xt = !1),
          Kt && wt(),
          Qt && te(),
          Zt && !bt && Ct(),
          (Kt = Qt = Zt = bt = Xt);
      }
      (s.batch = $t),
        (s.setCursor = function (n) {
          (Yt = n.left), (Dt = n.top), te();
        });
      var ne = 0;
      function te(n) {
        if (Xt) Qt = !0;
        else {
          var t;
          if (
            ((ne = 0),
            Un.show && (Un.x && _(yt, i(Yt), 0), Un.y && _(Mt, 0, i(Dt))),
            0 > Yt || 0 == Qn)
          ) {
            t = null;
            for (var o = 0; j.length > o; o++)
              if (
                (o > 0 &&
                  ((Ut[o] = 1 / 0), qn.length > 1 && _(qn[o], -10, -10)),
                bn)
              ) {
                if (0 == o && Rn) continue;
                for (var a = 0; In[o].length > a; a++)
                  In[o][a].firstChild.nodeValue = "--";
              }
            On && Gt(null, { focus: !0 }, pe.setSeries);
          } else {
            t = qt(Yt);
            for (
              var f = g(_n(e[0][t], J[$n], rt, 0)), c = 0;
              j.length > c;
              c++
            ) {
              var v = j[c];
              if (c > 0 && v.show) {
                var h = e[c][t],
                  m = null == h ? -10 : g(Cn(h, J[v.scale], ot, 0));
                (Ut[c] = m > 0 ? r(m - Dt) : 1 / 0),
                  qn.length > 1 && _(qn[c], f, m);
              } else Ut[c] = 1 / 0;
              if (bn) {
                if (0 == c && Rn) continue;
                var p = 0 == c && 2 == nt ? mt : e[c],
                  d = Rn ? v.values(s, c, t) : { _: v.value(s, p[t], c, t) },
                  x = 0;
                for (var w in d) In[c][x++].firstChild.nodeValue = d[w];
              }
            }
          }
          if (Yt >= 0 && Lt.show && Ht) {
            if (Pt.x) {
              var b = l(kt, Yt),
                y = u(kt, Yt);
              A(Bt, Y, (Lt[Y] = b)), A(Bt, k, (Lt[k] = y - b));
            }
            if (Pt.y) {
              var M = l(St, Dt),
                D = u(St, Dt);
              A(Bt, "top", (Lt.top = M)), A(Bt, S, (Lt[S] = D - M));
            }
          }
          if (null != n && (ge.pub("mousemove", s, Yt, Dt, rt, ot, t), On)) {
            var E = l.apply(null, Ut),
              T = null;
            E > Vn.prox ||
              Ut.some(function (n, t) {
                if (n == E) return (T = t);
              }),
              Gt(T, { focus: !0 }, pe.setSeries);
          }
          (Un.idx = t), (Un.left = Yt), (Un.top = Dt), R && me("setCursor");
        }
      }
      var ee = null;
      function re() {
        ee = I.getBoundingClientRect();
      }
      function oe(n, t, e, r, o, i) {
        Un.locked ||
          (ie(n, 0, e, r, o, i, 0, !1, null != n),
          null != n ? 0 == ne && (ne = D(te)) : te());
      }
      function ie(n, t, e, r, o, i, a, l, u) {
        null != n
          ? ((e = n.clientX - ee.left), (r = n.clientY - ee.top))
          : ((e = rt * (e / o)), (r = ot * (r / i))),
          u &&
            ((e > 1 && rt - 1 > e) || (e = v(e, rt)),
            (r > 1 && ot - 1 > r) || (r = v(r, ot))),
          l ? ((kt = e), (St = r)) : ((Yt = e), (Dt = r));
      }
      function ae() {
        It({ width: Pt.x ? 0 : rt, height: Pt.y ? 0 : ot }, !1);
      }
      function le(n, t, e, r, o, i) {
        (null == n || Ln(n)) &&
          ((Ht = !0),
          ie(n, 0, e, r, o, i, 0, !0, !0),
          Lt.show && (Pt.x || Pt.y) && ae(),
          null != n &&
            (P("mouseup", E, ue),
            ge.pub("mousedown", s, kt, St, rt, ot, null)));
      }
      function ue(n, t, e, r, o, i) {
        (null == n || Ln(n)) &&
          ((Ht = !1),
          ie(n, 0, e, r, o, i, 0, !1, !0),
          Yt != kt || Dt != St
            ? (It(Lt),
              Pt.setScale &&
                ($t(function () {
                  if (Pt.x) {
                    var n = 2 == nt ? qt : Ot;
                    jt($n, n(Lt[Y], $n), n(Lt[Y] + Lt[k], $n));
                  }
                  if (Pt.y)
                    for (var t in J)
                      t != $n &&
                        null == J[t].from &&
                        jt(t, Ot(ot - Lt.top - Lt[S], t), Ot(ot - Lt.top, t));
                }),
                ae()))
            : Un.lock && ((Un.locked = !Un.locked), Un.locked || te()),
          null != n &&
            (N("mouseup", E, ue), ge.pub("mouseup", s, Yt, Dt, rt, ot, null)));
      }
      function se(n) {
        dt(), null != n && ge.pub("dblclick", s, Yt, Dt, rt, ot, null);
      }
      var fe,
        ce = {};
      (ce.mousedown = le),
        (ce.mousemove = oe),
        (ce.mouseup = ue),
        (ce.dblclick = se),
        (ce.setSeries = function (n, t, e, r) {
          Gt(e, r);
        }),
        Un.show &&
          (P("mousedown", I, le),
          P("mousemove", I, oe),
          P("mouseenter", I, re),
          P("mouseleave", I, function () {
            Un.locked || Ht || ((Yt = -10), (Dt = -10), te(1));
          }),
          Pt.setScale && P("dblclick", I, se),
          (fe = (function (n) {
            var t = null;
            function e() {
              (t = null), n();
            }
            return function () {
              clearTimeout(t), (t = setTimeout(e, 100));
            };
          })(re)),
          P("resize", T, fe),
          P("scroll", T, fe),
          (s.syncRect = re));
      var ve = (s.hooks = t.hooks || {}),
        he = [s];
      function me(n) {
        if (n in ve) {
          var t = he.concat(Array.prototype.slice.call(arguments, 1));
          ve[n].forEach(function (n) {
            n.apply(null, t);
          });
        }
      }
      (t.plugins || []).forEach(function (n) {
        for (var t in n.hooks) ve[t] = (ve[t] || []).concat(n.hooks[t]);
      });
      var pe = M({ key: null, setSeries: !1 }, Un.sync),
        de = pe.key,
        ge = null != de ? (Wn[de] = Wn[de] || zn()) : zn();
      function xe() {
        xt(t[k], t[S]),
          me("init", t, e),
          pt(e || t.data, !1),
          ln[$n] ? _t($n, ln[$n]) : dt(),
          It(Lt, !1),
          (R = !0),
          me("ready");
      }
      return (
        ge.sub(s),
        (s.pub = function (n, t, e, r, o, i, a) {
          ce[n](null, t, e, r, o, i, a);
        }),
        (s.destroy = function () {
          ge.unsub(s),
            N("resize", T, fe),
            N("scroll", T, fe),
            f.remove(),
            me("destroy");
        }),
        a
          ? a instanceof HTMLElement
            ? (a.appendChild(f), xe())
            : a(s, xe)
          : xe(),
        s
      );
    }
    return (
      (In.assign = M),
      (In.rangeNum = t),
      (In.fmtDate = V),
      (In.tzDate = function (n, t) {
        var e = new Date(n.toLocaleString("en-US", { timeZone: t }));
        return e.setMilliseconds(n.getMilliseconds()), e;
      }),
      In
    );
  })();

  /* src\Graph.svelte generated by Svelte v3.22.2 */

  const { Object: Object_1 } = globals;
  const file = "src\\Graph.svelte";

  // (89:7)
  function fallback_block(ctx) {
    let div;
    let div_class_value;
    let div_data_series_value;

    const block = {
      c: function create() {
        div = element("div");
        attr_dev(div, "class", (div_class_value = "graph " + /*type*/ ctx[0]));
        attr_dev(
          div,
          "data-series",
          (div_data_series_value = JSON.stringify(
            Object.entries(/*data*/ ctx[1])
          ))
        );
        add_location(div, file, 89, 8, 1918);
      },
      m: function mount(target, anchor) {
        insert_dev(target, div, anchor);
        /*div_binding*/ ctx[13](div);
      },
      p: function update(ctx, dirty) {
        if (
          dirty & /*type*/ 1 &&
          div_class_value !== (div_class_value = "graph " + /*type*/ ctx[0])
        ) {
          attr_dev(div, "class", div_class_value);
        }

        if (
          dirty & /*data*/ 2 &&
          div_data_series_value !==
            (div_data_series_value = JSON.stringify(
              Object.entries(/*data*/ ctx[1])
            ))
        ) {
          attr_dev(div, "data-series", div_data_series_value);
        }
      },
      d: function destroy(detaching) {
        if (detaching) detach_dev(div);
        /*div_binding*/ ctx[13](null);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: fallback_block.name,
      type: "fallback",
      source: "(89:7)          ",
      ctx,
    });

    return block;
  }

  function create_fragment(ctx) {
    let div;
    let current;
    const default_slot_template = /*$$slots*/ ctx[12].default;
    const default_slot = create_slot(
      default_slot_template,
      ctx,
      /*$$scope*/ ctx[11],
      null
    );
    const default_slot_or_fallback = default_slot || fallback_block(ctx);

    const block = {
      c: function create() {
        div = element("div");
        if (default_slot_or_fallback) default_slot_or_fallback.c();
        add_location(div, file, 87, 0, 1896);
      },
      l: function claim(nodes) {
        throw new Error(
          "options.hydrate only works if the component was compiled with the `hydratable: true` option"
        );
      },
      m: function mount(target, anchor) {
        insert_dev(target, div, anchor);

        if (default_slot_or_fallback) {
          default_slot_or_fallback.m(div, null);
        }

        current = true;
      },
      p: function update(ctx, [dirty]) {
        if (default_slot) {
          if (default_slot.p && dirty & /*$$scope*/ 2048) {
            default_slot.p(
              get_slot_context(
                default_slot_template,
                ctx,
                /*$$scope*/ ctx[11],
                null
              ),
              get_slot_changes(
                default_slot_template,
                /*$$scope*/ ctx[11],
                dirty,
                null
              )
            );
          }
        } else {
          if (
            default_slot_or_fallback &&
            default_slot_or_fallback.p &&
            dirty & /*type, data, data_elem*/ 7
          ) {
            default_slot_or_fallback.p(ctx, dirty);
          }
        }
      },
      i: function intro(local) {
        if (current) return;
        transition_in(default_slot_or_fallback, local);
        current = true;
      },
      o: function outro(local) {
        transition_out(default_slot_or_fallback, local);
        current = false;
      },
      d: function destroy(detaching) {
        if (detaching) detach_dev(div);
        if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_fragment.name,
      type: "component",
      source: "",
      ctx,
    });

    return block;
  }

  function extract_data(elem) {
    let data = JSON.parse(elem.attributes["data-series"].nodeValue);
    let data2 = [[], []];

    for (let i of data) {
      data2[0].push(parseInt(i[0]));
      data2[1].push(i[1]);
    }

    return data2;
  }

  function instance($$self, $$props, $$invalidate) {
    let { type = "" } = $$props;
    let { data = {} } = $$props;
    let { title = "" } = $$props;
    let { height = 100 } = $$props;
    let { show_x_axis = false } = $$props;
    let data_elem;
    let DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let created_graph = false;

    afterUpdate(() => {
      if (data_elem && !created_graph) {
        let d = extract_data(data_elem);

        if (type == "mph_by_dow") {
          createGraph_MphByDow(d, data_elem);
        } else if (type == "mph_by_hod") {
          createGraph_MphByHod(d, data_elem);
        }

        created_graph = true;
      }
    });

    function createGraph_MphByDow(data, elem) {
      return createGraph(
        data,
        elem,
        {
          label: "Day of Week",
          value: (self, rawValue) => DAYS[rawValue],
        },
        { title, width: 400, height }
      );
    }

    function createGraph_MphByHod(data, elem) {
      return createGraph(
        data,
        elem,
        {
          label: "Hour of Day",
          value: (self, rawValue) => rawValue,
        },
        { title, width: 400, height }
      );
    }

    function createGraph(data, elem, xaxis, ext_opts) {
      let opts = {
        ...ext_opts,
        axes: [{ show: show_x_axis }, { show: true }],
        series: [
          xaxis,
          {
            show: true,
            spanGaps: true,
            label: "Messages per hour (Avg)",
            value: (self, rawValue) => rawValue.toFixed(2),
            width: 1,
            stroke: "#03a9f4",
            fill: "#b3e5fc",
          },
        ],
        scales: { x: { time: false } },
      };

      let uplot = new uPlot(opts, data, elem);
    }

    const writable_props = ["type", "data", "title", "height", "show_x_axis"];

    Object_1.keys($$props).forEach((key) => {
      if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$")
        console.warn(`<Graph> was created with unknown prop '${key}'`);
    });

    let { $$slots = {}, $$scope } = $$props;
    validate_slots("Graph", $$slots, ["default"]);

    function div_binding($$value) {
      binding_callbacks[$$value ? "unshift" : "push"](() => {
        $$invalidate(2, (data_elem = $$value));
      });
    }

    $$self.$set = ($$props) => {
      if ("type" in $$props) $$invalidate(0, (type = $$props.type));
      if ("data" in $$props) $$invalidate(1, (data = $$props.data));
      if ("title" in $$props) $$invalidate(3, (title = $$props.title));
      if ("height" in $$props) $$invalidate(4, (height = $$props.height));
      if ("show_x_axis" in $$props)
        $$invalidate(5, (show_x_axis = $$props.show_x_axis));
      if ("$$scope" in $$props) $$invalidate(11, ($$scope = $$props.$$scope));
    };

    $$self.$capture_state = () => ({
      type,
      data,
      title,
      height,
      show_x_axis,
      uPlot,
      afterUpdate,
      data_elem,
      DAYS,
      created_graph,
      extract_data,
      createGraph_MphByDow,
      createGraph_MphByHod,
      createGraph,
    });

    $$self.$inject_state = ($$props) => {
      if ("type" in $$props) $$invalidate(0, (type = $$props.type));
      if ("data" in $$props) $$invalidate(1, (data = $$props.data));
      if ("title" in $$props) $$invalidate(3, (title = $$props.title));
      if ("height" in $$props) $$invalidate(4, (height = $$props.height));
      if ("show_x_axis" in $$props)
        $$invalidate(5, (show_x_axis = $$props.show_x_axis));
      if ("data_elem" in $$props)
        $$invalidate(2, (data_elem = $$props.data_elem));
      if ("DAYS" in $$props) DAYS = $$props.DAYS;
      if ("created_graph" in $$props) created_graph = $$props.created_graph;
    };

    if ($$props && "$$inject" in $$props) {
      $$self.$inject_state($$props.$$inject);
    }

    return [
      type,
      data,
      data_elem,
      title,
      height,
      show_x_axis,
      created_graph,
      DAYS,
      createGraph_MphByDow,
      createGraph_MphByHod,
      createGraph,
      $$scope,
      $$slots,
      div_binding,
    ];
  }

  class Graph extends SvelteComponentDev {
    constructor(options) {
      super(options);

      init(this, options, instance, create_fragment, safe_not_equal, {
        type: 0,
        data: 1,
        title: 3,
        height: 4,
        show_x_axis: 5,
      });

      dispatch_dev("SvelteRegisterComponent", {
        component: this,
        tagName: "Graph",
        options,
        id: create_fragment.name,
      });
    }

    get type() {
      throw new Error(
        "<Graph>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      );
    }

    set type(value) {
      throw new Error(
        "<Graph>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      );
    }

    get data() {
      throw new Error(
        "<Graph>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      );
    }

    set data(value) {
      throw new Error(
        "<Graph>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      );
    }

    get title() {
      throw new Error(
        "<Graph>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      );
    }

    set title(value) {
      throw new Error(
        "<Graph>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      );
    }

    get height() {
      throw new Error(
        "<Graph>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      );
    }

    set height(value) {
      throw new Error(
        "<Graph>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      );
    }

    get show_x_axis() {
      throw new Error(
        "<Graph>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      );
    }

    set show_x_axis(value) {
      throw new Error(
        "<Graph>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      );
    }
  }

  /* src\App.svelte generated by Svelte v3.22.2 */

  const { Object: Object_1$1, console: console_1 } = globals;
  const file$1 = "src\\App.svelte";

  function get_each_context_1(ctx, list, i) {
    const child_ctx = ctx.slice();
    child_ctx[23] = list[i];
    child_ctx[20] = i;
    return child_ctx;
  }

  function get_each_context(ctx, list, i) {
    const child_ctx = ctx.slice();
    child_ctx[18] = list[i];
    child_ctx[20] = i;
    return child_ctx;
  }

  // (191:4) {:catch error}
  function create_catch_block(ctx) {
    let t;

    const block = {
      c: function create() {
        t = text("Error loading channels");
      },
      m: function mount(target, anchor) {
        insert_dev(target, t, anchor);
      },
      p: noop,
      i: noop,
      o: noop,
      d: function destroy(detaching) {
        if (detaching) detach_dev(t);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_catch_block.name,
      type: "catch",
      source: "(191:4) {:catch error}",
      ctx,
    });

    return block;
  }

  // (141:4) {:then channel_list}
  function create_then_block(ctx) {
    let div;
    let t0;
    let button0;
    let t2;
    let button1;
    let t4;
    let button2;
    let t6;
    let button3;
    let t8;
    let ul;
    let current;
    let dispose;

    function click_handler(...args) {
      return /*click_handler*/ ctx[14](/*s*/ ctx[18], ...args);
    }

    function click_handler_1(...args) {
      return /*click_handler_1*/ ctx[15](/*s*/ ctx[18], ...args);
    }

    function click_handler_2(...args) {
      return /*click_handler_2*/ ctx[16](/*s*/ ctx[18], ...args);
    }

    function click_handler_3(...args) {
      return /*click_handler_3*/ ctx[17](/*s*/ ctx[18], ...args);
    }

    let each_value_1 = /*channel_list*/ ctx[21];
    validate_each_argument(each_value_1);
    let each_blocks = [];

    for (let i = 0; i < each_value_1.length; i += 1) {
      each_blocks[i] = create_each_block_1(
        get_each_context_1(ctx, each_value_1, i)
      );
    }

    const out = (i) =>
      transition_out(each_blocks[i], 1, 1, () => {
        each_blocks[i] = null;
      });

    const block = {
      c: function create() {
        div = element("div");
        t0 = text("Sort by:\n\t\t\t\t\t\t");
        button0 = element("button");
        button0.textContent = "Name";
        t2 = space();
        button1 = element("button");
        button1.textContent = "Last message";
        t4 = space();
        button2 = element("button");
        button2.textContent = "Messages in the last hour";
        t6 = space();
        button3 = element("button");
        button3.textContent = "Total messages";
        t8 = space();
        ul = element("ul");

        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].c();
        }

        add_location(button0, file$1, 143, 6, 3763);
        add_location(button1, file$1, 146, 6, 3849);
        add_location(button2, file$1, 149, 6, 3951);
        add_location(button3, file$1, 152, 6, 4072);
        attr_dev(div, "class", "sort_menu svelte-1hhswl0");
        add_location(div, file$1, 141, 5, 3718);
        add_location(ul, file$1, 159, 5, 4282);
      },
      m: function mount(target, anchor, remount) {
        insert_dev(target, div, anchor);
        append_dev(div, t0);
        append_dev(div, button0);
        append_dev(div, t2);
        append_dev(div, button1);
        append_dev(div, t4);
        append_dev(div, button2);
        append_dev(div, t6);
        append_dev(div, button3);
        insert_dev(target, t8, anchor);
        insert_dev(target, ul, anchor);

        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].m(ul, null);
        }

        current = true;
        if (remount) run_all(dispose);

        dispose = [
          listen_dev(button0, "click", click_handler, false, false, false),
          listen_dev(button1, "click", click_handler_1, false, false, false),
          listen_dev(button2, "click", click_handler_2, false, false, false),
          listen_dev(button3, "click", click_handler_3, false, false, false),
        ];
      },
      p: function update(new_ctx, dirty) {
        ctx = new_ctx;

        if (dirty & /*get_channels, server_list*/ 33) {
          each_value_1 = /*channel_list*/ ctx[21];
          validate_each_argument(each_value_1);
          let i;

          for (i = 0; i < each_value_1.length; i += 1) {
            const child_ctx = get_each_context_1(ctx, each_value_1, i);

            if (each_blocks[i]) {
              each_blocks[i].p(child_ctx, dirty);
              transition_in(each_blocks[i], 1);
            } else {
              each_blocks[i] = create_each_block_1(child_ctx);
              each_blocks[i].c();
              transition_in(each_blocks[i], 1);
              each_blocks[i].m(ul, null);
            }
          }

          group_outros();

          for (i = each_value_1.length; i < each_blocks.length; i += 1) {
            out(i);
          }

          check_outros();
        }
      },
      i: function intro(local) {
        if (current) return;

        for (let i = 0; i < each_value_1.length; i += 1) {
          transition_in(each_blocks[i]);
        }

        current = true;
      },
      o: function outro(local) {
        each_blocks = each_blocks.filter(Boolean);

        for (let i = 0; i < each_blocks.length; i += 1) {
          transition_out(each_blocks[i]);
        }

        current = false;
      },
      d: function destroy(detaching) {
        if (detaching) detach_dev(div);
        if (detaching) detach_dev(t8);
        if (detaching) detach_dev(ul);
        destroy_each(each_blocks, detaching);
        run_all(dispose);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_then_block.name,
      type: "then",
      source: "(141:4) {:then channel_list}",
      ctx,
    });

    return block;
  }

  // (161:5) {#each channel_list as c, i}
  function create_each_block_1(ctx) {
    let li;
    let div0;
    let a;
    let t0_value = /*c*/ ctx[23].name + "";
    let t0;
    let a_href_value;
    let t1;
    let div4;
    let div1;
    let t2_value = /*c*/ ctx[23].total_messages + "";
    let t2;
    let t3;
    let t4;
    let div2;
    let t5_value = /*c*/ ctx[23].messages_last_hour + "";
    let t5;
    let t6;
    let t7;
    let div3;
    let time;
    let t8;
    let t9_value = /*c*/ ctx[23].last_message.date_text + "";
    let t9;
    let time_datetime_value;
    let t10;
    let div5;
    let t11;
    let t12;
    let current;

    const graph0 = new Graph({
      props: {
        type: "mph_by_dow",
        data: /*c*/ ctx[23].mph_by_dow,
      },
      $$inline: true,
    });

    const graph1 = new Graph({
      props: {
        type: "mph_by_hod",
        data: /*c*/ ctx[23].mph_by_hod,
        show_x_axis: "true",
      },
      $$inline: true,
    });

    const block = {
      c: function create() {
        li = element("li");
        div0 = element("div");
        a = element("a");
        t0 = text(t0_value);
        t1 = space();
        div4 = element("div");
        div1 = element("div");
        t2 = text(t2_value);
        t3 = text(" messages");
        t4 = space();
        div2 = element("div");
        t5 = text(t5_value);
        t6 = text(" in the last hour");
        t7 = space();
        div3 = element("div");
        time = element("time");
        t8 = text("Last message: ");
        t9 = text(t9_value);
        t10 = space();
        div5 = element("div");
        create_component(graph0.$$.fragment);
        t11 = space();
        create_component(graph1.$$.fragment);
        t12 = space();
        attr_dev(
          a,
          "href",
          (a_href_value =
            "https://discord.com/channels/" +
            /*s*/ ctx[18].id +
            "/" +
            /*c*/ ctx[23].id)
        );
        attr_dev(a, "target", "_blank");
        add_location(a, file$1, 163, 8, 4395);
        attr_dev(div0, "class", "channel_name svelte-1hhswl0");
        add_location(div0, file$1, 162, 7, 4360);
        add_location(div1, file$1, 169, 8, 4554);
        add_location(div2, file$1, 172, 8, 4620);
        attr_dev(
          time,
          "datetime",
          (time_datetime_value = /*c*/ ctx[23].last_message.date)
        );
        add_location(time, file$1, 176, 9, 4713);
        add_location(div3, file$1, 175, 8, 4698);
        attr_dev(div4, "class", "channel_stats svelte-1hhswl0");
        add_location(div4, file$1, 168, 7, 4518);
        attr_dev(div5, "class", "server_activity_graphs svelte-1hhswl0");
        add_location(div5, file$1, 182, 7, 4857);
        attr_dev(li, "class", "channel_item svelte-1hhswl0");
        add_location(li, file$1, 161, 6, 4327);
      },
      m: function mount(target, anchor) {
        insert_dev(target, li, anchor);
        append_dev(li, div0);
        append_dev(div0, a);
        append_dev(a, t0);
        append_dev(li, t1);
        append_dev(li, div4);
        append_dev(div4, div1);
        append_dev(div1, t2);
        append_dev(div1, t3);
        append_dev(div4, t4);
        append_dev(div4, div2);
        append_dev(div2, t5);
        append_dev(div2, t6);
        append_dev(div4, t7);
        append_dev(div4, div3);
        append_dev(div3, time);
        append_dev(time, t8);
        append_dev(time, t9);
        append_dev(li, t10);
        append_dev(li, div5);
        mount_component(graph0, div5, null);
        append_dev(div5, t11);
        mount_component(graph1, div5, null);
        append_dev(li, t12);
        current = true;
      },
      p: function update(ctx, dirty) {
        if (
          (!current || dirty & /*server_list*/ 1) &&
          t0_value !== (t0_value = /*c*/ ctx[23].name + "")
        )
          set_data_dev(t0, t0_value);

        if (
          !current ||
          (dirty & /*server_list*/ 1 &&
            a_href_value !==
              (a_href_value =
                "https://discord.com/channels/" +
                /*s*/ ctx[18].id +
                "/" +
                /*c*/ ctx[23].id))
        ) {
          attr_dev(a, "href", a_href_value);
        }

        if (
          (!current || dirty & /*server_list*/ 1) &&
          t2_value !== (t2_value = /*c*/ ctx[23].total_messages + "")
        )
          set_data_dev(t2, t2_value);
        if (
          (!current || dirty & /*server_list*/ 1) &&
          t5_value !== (t5_value = /*c*/ ctx[23].messages_last_hour + "")
        )
          set_data_dev(t5, t5_value);
        if (
          (!current || dirty & /*server_list*/ 1) &&
          t9_value !== (t9_value = /*c*/ ctx[23].last_message.date_text + "")
        )
          set_data_dev(t9, t9_value);

        if (
          !current ||
          (dirty & /*server_list*/ 1 &&
            time_datetime_value !==
              (time_datetime_value = /*c*/ ctx[23].last_message.date))
        ) {
          attr_dev(time, "datetime", time_datetime_value);
        }

        const graph0_changes = {};
        if (dirty & /*server_list*/ 1)
          graph0_changes.data = /*c*/ ctx[23].mph_by_dow;
        graph0.$set(graph0_changes);
        const graph1_changes = {};
        if (dirty & /*server_list*/ 1)
          graph1_changes.data = /*c*/ ctx[23].mph_by_hod;
        graph1.$set(graph1_changes);
      },
      i: function intro(local) {
        if (current) return;
        transition_in(graph0.$$.fragment, local);
        transition_in(graph1.$$.fragment, local);
        current = true;
      },
      o: function outro(local) {
        transition_out(graph0.$$.fragment, local);
        transition_out(graph1.$$.fragment, local);
        current = false;
      },
      d: function destroy(detaching) {
        if (detaching) detach_dev(li);
        destroy_component(graph0);
        destroy_component(graph1);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_each_block_1.name,
      type: "each",
      source: "(161:5) {#each channel_list as c, i}",
      ctx,
    });

    return block;
  }

  // (139:31)       <p>...waiting for channels...</p>     {:then channel_list}
  function create_pending_block(ctx) {
    let p;

    const block = {
      c: function create() {
        p = element("p");
        p.textContent = "...waiting for channels...";
        add_location(p, file$1, 139, 5, 3654);
      },
      m: function mount(target, anchor) {
        insert_dev(target, p, anchor);
      },
      p: noop,
      i: noop,
      o: noop,
      d: function destroy(detaching) {
        if (detaching) detach_dev(p);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_pending_block.name,
      type: "pending",
      source:
        "(139:31)       <p>...waiting for channels...</p>     {:then channel_list}",
      ctx,
    });

    return block;
  }

  // (98:1) {#each server_list as s, i}
  function create_each_block(ctx) {
    let li;
    let div0;
    let t0_value = /*s*/ ctx[18].name + "";
    let t0;
    let t1;
    let div4;
    let div1;
    let t2_value = /*s*/ ctx[18].total_members + "";
    let t2;
    let t3;
    let t4;
    let div2;
    let t5_value = /*s*/ ctx[18].channel_count + "";
    let t5;
    let t6;
    let t7;
    let div3;
    let t8_value = /*s*/ ctx[18].total_messages + "";
    let t8;
    let t9;
    let t10;
    let div7;
    let b0;
    let t12;
    let div5;
    let t13;
    let t14_value = /*s*/ ctx[18].members_joined_last_24h + "";
    let t14;
    let t15;
    let t16;
    let div6;
    let t17;
    let t18_value = /*s*/ ctx[18].members_joined_per_day_avg.toFixed(2) + "";
    let t18;
    let t19;
    let t20;
    let div10;
    let div8;
    let b1;
    let t22;
    let time;
    let t23;
    let t24_value = /*s*/ ctx[18].last_message.date_text + "";
    let t24;
    let time_datetime_value;
    let t25;
    let div9;
    let t26_value = /*s*/ ctx[18].messages_last_hour + "";
    let t26;
    let t27;
    let t28;
    let div11;
    let t29;
    let t30;
    let div12;
    let promise;
    let t31;
    let current;

    const graph0 = new Graph({
      props: {
        type: "mph_by_dow",
        data: /*s*/ ctx[18].mph_by_dow,
        title: "Messages by Day of Week",
      },
      $$inline: true,
    });

    const graph1 = new Graph({
      props: {
        type: "mph_by_hod",
        data: /*s*/ ctx[18].mph_by_hod,
        title: "Messages by Hour of Day (UTC)",
        show_x_axis: "true",
      },
      $$inline: true,
    });

    let info = {
      ctx,
      current: null,
      token: null,
      pending: create_pending_block,
      then: create_then_block,
      catch: create_catch_block,
      value: 21,
      error: 22,
      blocks: [, , ,],
    };

    handle_promise((promise = /*get_channels*/ ctx[5](/*s*/ ctx[18].id)), info);

    const block = {
      c: function create() {
        li = element("li");
        div0 = element("div");
        t0 = text(t0_value);
        t1 = space();
        div4 = element("div");
        div1 = element("div");
        t2 = text(t2_value);
        t3 = text(" members");
        t4 = space();
        div2 = element("div");
        t5 = text(t5_value);
        t6 = text(" channels");
        t7 = space();
        div3 = element("div");
        t8 = text(t8_value);
        t9 = text(" messages");
        t10 = space();
        div7 = element("div");
        b0 = element("b");
        b0.textContent = "Member Growth";
        t12 = space();
        div5 = element("div");
        t13 = text("+");
        t14 = text(t14_value);
        t15 = text(" in the last day");
        t16 = space();
        div6 = element("div");
        t17 = text("+");
        t18 = text(t18_value);
        t19 = text(" every day (avg)");
        t20 = space();
        div10 = element("div");
        div8 = element("div");
        b1 = element("b");
        b1.textContent = "Activity";
        t22 = space();
        time = element("time");
        t23 = text("Last message: ");
        t24 = text(t24_value);
        t25 = space();
        div9 = element("div");
        t26 = text(t26_value);
        t27 = text(" messages in the last hour");
        t28 = space();
        div11 = element("div");
        create_component(graph0.$$.fragment);
        t29 = space();
        create_component(graph1.$$.fragment);
        t30 = space();
        div12 = element("div");
        info.block.c();
        t31 = space();
        attr_dev(div0, "class", "server_name svelte-1hhswl0");
        add_location(div0, file$1, 99, 3, 2606);
        add_location(div1, file$1, 103, 4, 2689);
        add_location(div2, file$1, 106, 4, 2741);
        add_location(div3, file$1, 109, 4, 2794);
        attr_dev(div4, "class", "server_stats svelte-1hhswl0");
        add_location(div4, file$1, 102, 3, 2658);
        add_location(b0, file$1, 114, 4, 2889);
        add_location(div5, file$1, 115, 4, 2914);
        add_location(div6, file$1, 118, 4, 2985);
        attr_dev(div7, "class", "server_growth svelte-1hhswl0");
        add_location(div7, file$1, 113, 3, 2857);
        add_location(b1, file$1, 124, 5, 3124);
        add_location(div8, file$1, 123, 4, 3113);
        attr_dev(
          time,
          "datetime",
          (time_datetime_value = /*s*/ ctx[18].last_message.date)
        );
        add_location(time, file$1, 126, 4, 3155);
        add_location(div9, file$1, 129, 4, 3256);
        attr_dev(div10, "class", "server_activity svelte-1hhswl0");
        add_location(div10, file$1, 122, 3, 3079);
        attr_dev(div11, "class", "server_activity_graphs svelte-1hhswl0");
        add_location(div11, file$1, 133, 3, 3340);
        attr_dev(div12, "class", "server_channel_list svelte-1hhswl0");
        add_location(div12, file$1, 137, 3, 3583);
        attr_dev(li, "class", "server_item svelte-1hhswl0");
        add_location(li, file$1, 98, 2, 2578);
      },
      m: function mount(target, anchor) {
        insert_dev(target, li, anchor);
        append_dev(li, div0);
        append_dev(div0, t0);
        append_dev(li, t1);
        append_dev(li, div4);
        append_dev(div4, div1);
        append_dev(div1, t2);
        append_dev(div1, t3);
        append_dev(div4, t4);
        append_dev(div4, div2);
        append_dev(div2, t5);
        append_dev(div2, t6);
        append_dev(div4, t7);
        append_dev(div4, div3);
        append_dev(div3, t8);
        append_dev(div3, t9);
        append_dev(li, t10);
        append_dev(li, div7);
        append_dev(div7, b0);
        append_dev(div7, t12);
        append_dev(div7, div5);
        append_dev(div5, t13);
        append_dev(div5, t14);
        append_dev(div5, t15);
        append_dev(div7, t16);
        append_dev(div7, div6);
        append_dev(div6, t17);
        append_dev(div6, t18);
        append_dev(div6, t19);
        append_dev(li, t20);
        append_dev(li, div10);
        append_dev(div10, div8);
        append_dev(div8, b1);
        append_dev(div10, t22);
        append_dev(div10, time);
        append_dev(time, t23);
        append_dev(time, t24);
        append_dev(div10, t25);
        append_dev(div10, div9);
        append_dev(div9, t26);
        append_dev(div9, t27);
        append_dev(li, t28);
        append_dev(li, div11);
        mount_component(graph0, div11, null);
        append_dev(div11, t29);
        mount_component(graph1, div11, null);
        append_dev(li, t30);
        append_dev(li, div12);
        info.block.m(div12, (info.anchor = null));
        info.mount = () => div12;
        info.anchor = null;
        append_dev(li, t31);
        current = true;
      },
      p: function update(new_ctx, dirty) {
        ctx = new_ctx;
        if (
          (!current || dirty & /*server_list*/ 1) &&
          t0_value !== (t0_value = /*s*/ ctx[18].name + "")
        )
          set_data_dev(t0, t0_value);
        if (
          (!current || dirty & /*server_list*/ 1) &&
          t2_value !== (t2_value = /*s*/ ctx[18].total_members + "")
        )
          set_data_dev(t2, t2_value);
        if (
          (!current || dirty & /*server_list*/ 1) &&
          t5_value !== (t5_value = /*s*/ ctx[18].channel_count + "")
        )
          set_data_dev(t5, t5_value);
        if (
          (!current || dirty & /*server_list*/ 1) &&
          t8_value !== (t8_value = /*s*/ ctx[18].total_messages + "")
        )
          set_data_dev(t8, t8_value);
        if (
          (!current || dirty & /*server_list*/ 1) &&
          t14_value !== (t14_value = /*s*/ ctx[18].members_joined_last_24h + "")
        )
          set_data_dev(t14, t14_value);
        if (
          (!current || dirty & /*server_list*/ 1) &&
          t18_value !==
            (t18_value =
              /*s*/ ctx[18].members_joined_per_day_avg.toFixed(2) + "")
        )
          set_data_dev(t18, t18_value);
        if (
          (!current || dirty & /*server_list*/ 1) &&
          t24_value !== (t24_value = /*s*/ ctx[18].last_message.date_text + "")
        )
          set_data_dev(t24, t24_value);

        if (
          !current ||
          (dirty & /*server_list*/ 1 &&
            time_datetime_value !==
              (time_datetime_value = /*s*/ ctx[18].last_message.date))
        ) {
          attr_dev(time, "datetime", time_datetime_value);
        }

        if (
          (!current || dirty & /*server_list*/ 1) &&
          t26_value !== (t26_value = /*s*/ ctx[18].messages_last_hour + "")
        )
          set_data_dev(t26, t26_value);
        const graph0_changes = {};
        if (dirty & /*server_list*/ 1)
          graph0_changes.data = /*s*/ ctx[18].mph_by_dow;
        graph0.$set(graph0_changes);
        const graph1_changes = {};
        if (dirty & /*server_list*/ 1)
          graph1_changes.data = /*s*/ ctx[18].mph_by_hod;
        graph1.$set(graph1_changes);
        info.ctx = ctx;

        if (
          dirty & /*server_list*/ 1 &&
          promise !== (promise = /*get_channels*/ ctx[5](/*s*/ ctx[18].id)) &&
          handle_promise(promise, info)
        );
        else {
          const child_ctx = ctx.slice();
          child_ctx[21] = info.resolved;
          info.block.p(child_ctx, dirty);
        }
      },
      i: function intro(local) {
        if (current) return;
        transition_in(graph0.$$.fragment, local);
        transition_in(graph1.$$.fragment, local);
        transition_in(info.block);
        current = true;
      },
      o: function outro(local) {
        transition_out(graph0.$$.fragment, local);
        transition_out(graph1.$$.fragment, local);

        for (let i = 0; i < 3; i += 1) {
          const block = info.blocks[i];
          transition_out(block);
        }

        current = false;
      },
      d: function destroy(detaching) {
        if (detaching) detach_dev(li);
        destroy_component(graph0);
        destroy_component(graph1);
        info.block.d();
        info.token = null;
        info = null;
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_each_block.name,
      type: "each",
      source: "(98:1) {#each server_list as s, i}",
      ctx,
    });

    return block;
  }

  function create_fragment$1(ctx) {
    let t0;
    let main;
    let h1;
    let t2;
    let ul;
    let t3;
    let link;
    let current;
    let each_value = /*server_list*/ ctx[0];
    validate_each_argument(each_value);
    let each_blocks = [];

    for (let i = 0; i < each_value.length; i += 1) {
      each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    }

    const out = (i) =>
      transition_out(each_blocks[i], 1, 1, () => {
        each_blocks[i] = null;
      });

    const block = {
      c: function create() {
        t0 = text("​\n\n");
        main = element("main");
        h1 = element("h1");
        h1.textContent = "Portal Radar";
        t2 = space();
        ul = element("ul");

        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].c();
        }

        t3 = space();
        link = element("link");
        attr_dev(h1, "class", "svelte-1hhswl0");
        add_location(h1, file$1, 95, 1, 2499);
        attr_dev(ul, "class", "server_list");
        add_location(ul, file$1, 96, 1, 2522);
        attr_dev(main, "class", "svelte-1hhswl0");
        add_location(main, file$1, 94, 0, 2491);
        attr_dev(link, "rel", "stylesheet");
        attr_dev(link, "href", "uPlot/uPlot.min.css");
        add_location(link, file$1, 306, 0, 6551);
      },
      l: function claim(nodes) {
        throw new Error(
          "options.hydrate only works if the component was compiled with the `hydratable: true` option"
        );
      },
      m: function mount(target, anchor) {
        insert_dev(target, t0, anchor);
        insert_dev(target, main, anchor);
        append_dev(main, h1);
        append_dev(main, t2);
        append_dev(main, ul);

        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].m(ul, null);
        }

        insert_dev(target, t3, anchor);
        insert_dev(target, link, anchor);
        current = true;
      },
      p: function update(ctx, [dirty]) {
        if (
          dirty &
          /*get_channels, server_list, sort_channels__total_messages, sort_channels__messages_last_hour, sort_channels__last_message, sort_channels__name*/ 63
        ) {
          each_value = /*server_list*/ ctx[0];
          validate_each_argument(each_value);
          let i;

          for (i = 0; i < each_value.length; i += 1) {
            const child_ctx = get_each_context(ctx, each_value, i);

            if (each_blocks[i]) {
              each_blocks[i].p(child_ctx, dirty);
              transition_in(each_blocks[i], 1);
            } else {
              each_blocks[i] = create_each_block(child_ctx);
              each_blocks[i].c();
              transition_in(each_blocks[i], 1);
              each_blocks[i].m(ul, null);
            }
          }

          group_outros();

          for (i = each_value.length; i < each_blocks.length; i += 1) {
            out(i);
          }

          check_outros();
        }
      },
      i: function intro(local) {
        if (current) return;

        for (let i = 0; i < each_value.length; i += 1) {
          transition_in(each_blocks[i]);
        }

        current = true;
      },
      o: function outro(local) {
        each_blocks = each_blocks.filter(Boolean);

        for (let i = 0; i < each_blocks.length; i += 1) {
          transition_out(each_blocks[i]);
        }

        current = false;
      },
      d: function destroy(detaching) {
        if (detaching) detach_dev(t0);
        if (detaching) detach_dev(main);
        destroy_each(each_blocks, detaching);
        if (detaching) detach_dev(t3);
        if (detaching) detach_dev(link);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_fragment$1.name,
      type: "component",
      source: "",
      ctx,
    });

    return block;
  }

  function instance$1($$self, $$props, $$invalidate) {
    let server_root = "https://portal-radar.herokuapp.com/";
    let server_list = [];
    let channels_dict = {};

    async function list_servers() {
      let r = await fetch(server_root + "servers/");

      if (!r.ok) {
        console.log("HTTP-Error: " + r.status);
        return {};
      }

      let json = await r.json();
      return Object.values(json);
    }

    async function list_channels(server, update = false) {
      let r = await fetch(
        server_root +
          "channels/" +
          server +
          "/" +
          (update ? "?update=true" : "")
      );

      if (!r.ok) {
        console.log("HTTP-Error: " + r.status);
        return {};
      }

      return await r.json();
    }

    function sort_channels(server_id, cmp) {
      let channels = channels_dict[server_id];
      channels.sort(cmp);
      $$invalidate(0, server_list);
    }

    function sort_channels__name(server) {
      let sort_func = function (a, b) {
        return a.name.localeCompare(b.name);
      };

      return sort_channels(server, sort_func);
    }

    function sort_channels__messages_last_hour(server) {
      let sort_func = function (a, b) {
        return b.messages_last_hour - a.messages_last_hour;
      };

      return sort_channels(server, sort_func);
    }

    function sort_channels__last_message(server) {
      let sort_func = function (a, b) {
        return new Date(b.last_message.date) - new Date(a.last_message.date);
      };

      return sort_channels(server, sort_func);
    }

    function sort_channels__total_messages(server) {
      let sort_func = function (a, b) {
        return b.total_messages - a.total_messages;
      };

      return sort_channels(server, sort_func);
    }

    async function update_channels(server_id) {
      console.debug("Updating");
      let c_list = channels_dict[server_id];
      let updated_channels = await list_channels(server_id, true);

      for (let c of c_list) {
        c.last_message = updated_channels[c.id].last_message;
        c.messages_last_hour = updated_channels[c.id].messages_last_hour;
      }

      $$invalidate(0, server_list);
    }

    async function update_channels_loop(server_id) {
      setTimeout(async () => {
        await update_channels(server_id);
        update_channels_loop(server_id);
      }, 10000);
    }

    async function get_channels(server_id) {
      if (!(server_id in channels_dict)) {
        let channels = Object.values(await list_channels(server_id));

        channels.sort(function (a, b) {
          return a.name.localeCompare(b.name);
        });

        channels_dict[server_id] = channels;
        console.log("Setting auto-update");
        await update_channels_loop(server_id);
      }

      return channels_dict[server_id];
    }

    async function init() {
      $$invalidate(0, (server_list = await list_servers()));
    }

    onMount(init);
    const writable_props = [];

    Object_1$1.keys($$props).forEach((key) => {
      if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$")
        console_1.warn(`<App> was created with unknown prop '${key}'`);
    });

    let { $$slots = {}, $$scope } = $$props;
    validate_slots("App", $$slots, []);
    const click_handler = (s) => sort_channels__name(s.id);
    const click_handler_1 = (s) => sort_channels__last_message(s.id);
    const click_handler_2 = (s) => sort_channels__messages_last_hour(s.id);
    const click_handler_3 = (s) => sort_channels__total_messages(s.id);

    $$self.$capture_state = () => ({
      afterUpdate,
      onMount,
      Graph,
      server_root,
      server_list,
      channels_dict,
      list_servers,
      list_channels,
      sort_channels,
      sort_channels__name,
      sort_channels__messages_last_hour,
      sort_channels__last_message,
      sort_channels__total_messages,
      update_channels,
      update_channels_loop,
      get_channels,
      init,
    });

    $$self.$inject_state = ($$props) => {
      if ("server_root" in $$props) server_root = $$props.server_root;
      if ("server_list" in $$props)
        $$invalidate(0, (server_list = $$props.server_list));
      if ("channels_dict" in $$props) channels_dict = $$props.channels_dict;
    };

    if ($$props && "$$inject" in $$props) {
      $$self.$inject_state($$props.$$inject);
    }

    return [
      server_list,
      sort_channels__name,
      sort_channels__messages_last_hour,
      sort_channels__last_message,
      sort_channels__total_messages,
      get_channels,
      channels_dict,
      server_root,
      list_servers,
      list_channels,
      sort_channels,
      update_channels,
      update_channels_loop,
      init,
      click_handler,
      click_handler_1,
      click_handler_2,
      click_handler_3,
    ];
  }

  class App extends SvelteComponentDev {
    constructor(options) {
      super(options);
      init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

      dispatch_dev("SvelteRegisterComponent", {
        component: this,
        tagName: "App",
        options,
        id: create_fragment$1.name,
      });
    }
  }

  const app = new App({
    target: document.body,
    props: {},
  });

  return app;
})();
//# sourceMappingURL=bundle.js.map
