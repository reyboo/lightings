"use strict";

/*
 * 2017 by Jay Zangwill
 */
(function () {
	'use strict';

	function Lightings(options) {
		return new Lightings.prototype.init(options);
	}
	Lightings.prototype = {
		constructor: Lightings,
		init: function init(options) {
			var _this = this;

			this.url = options.url;
			this.success = options.success;
			this.error = options.error;
			this.start = options.start;
			this.progress = options.progress;
			this.timeout = options.timeout || 0;
			this.type = options.type || "get";
			//this.flag用于判断返回值
			this.flag = this.dataType = options.dataType.toLowerCase() || "json";
			this.contentType = options.contentType || "application/x-www-form-urlencoded";
			this.data = options.data || null;
			this.callbackName = options.callbackName || "callback";
			this.async = options.async || true;
			this.xhr = new XMLHttpRequest();
			if (!this.url) {
				throw Error("url is undefined");
			}
			if (this.dataType === "xml" || this.dataType === "html") {
				this.dataType = "";
			}
			if (typeof this.async !== "boolean") {
				this.async = true;
			}
			//data格式化
			if (this.data && this.data.toString() === "[object Object]") {
				var temp = [];
				for (var key in this.data) {
					temp.push(key + "=" + this.data[key]);
				}
				this.data = temp.join("&");
			} else if (typeof this.data !== "string") {
				this.data = undefined;
			}
			//jsonp
			if (this.dataType === "jsonp") {
				var script = document.createElement("script"),
				    random = "" + Math.random() + Math.random(),
				    time = void 0;
				random = random.replace(/0\./g, "_");
				script.src = this.data ? this.url + "?" + this.callbackName + "=Lightings" + random + "&" + this.data : this.url + "?" + this.callbackName + "=Lightings" + random;
				document.body.appendChild(script);
				if (this.success && typeof this.success === "function") {
					window["Lightings" + random] = this.success;
				}
				document.body.removeChild(script);
				//如果是用户使jsonp就不走ajax请求了直接return
				return this;
			}
			//调用get请求
			if (this.type === "get") {
				this.get().then(function (data) {
					_this.success && _this.success.call(_this, data);
				}).catch(function (err) {
					_this.error && _this.error.call(_this, err);
				});
			}
			//调用post请求
			if (this.type === "post") {
				this.post().then(function (data) {
					_this.success && _this.success.call(_this, data);
				}).catch(function (err) {
					_this.error && _this.error.call(_this, err);
				});
			}
			return this;
		},
		//get请求
		get: function get() {
			return _promise("get", this);
		},

		//post请求
		post: function post() {
			return _promise("post", this);
		}
	};
	Lightings.prototype.init.prototype = Lightings.prototype;

	function _promise(method, context) {
		return new Promise(function (reslove, reject) {
			context.xhr.responseType = context.dataType;
			if (method === "get") {
				//如果是get请求，如果有数据，则吧数据添加在连接上发送到服务端
				var url = context.url;
				if (context.data) {
					url += "?" + context.data;
				}
				context.xhr.open(context.type, url, context.async);
				context.xhr.send(null);
			} else if (method === "post") {
				//如果是post请求需要设置请求头，并且把数据作为send的参数
				context.xhr.open(context.type, context.url, context.async);
				context.xhr.setRequestHeader("Content-type", context.contentType);
				context.xhr.send(context.data);
			}
			context.xhr.onreadystatechange = function () {
				if (this.readyState === 4) {
					if (this.status >= 200 && this.status < 300 || this.status === 304) {
						this.flag === "xml" ? reslove(this.responseXML) : reslove(this.response);
					} else {
						reject(this.status, this.statusText);
					}
				}
			};
			context.xhr.timeout = context.timeout;
			context.xhr.ontimeout = context.error;
			context.xhr.onloadstart = function (e) {
				context.start && context.start.call(this, e);
			};
			context.xhr.onprogress = function (e) {
				context.progress && context.progress.call(this, e);
			};
		});
	}
	window.Lightings = Lightings;
})();
if (!window.Promise) {
	var _Promise = function _Promise(fn) {
		var self = this;
		this.status = 'pending';
		this.thenCache = [];
		if (!(this instanceof _Promise)) {
			throw 'Defer is a constructor and should be called width "new" keyword';
		}
		if (typeof fn !== 'function') {
			throw 'Defer params must be a function';
		}
		//为了让传进来的函数在then后执行
		setTimeout(function () {
			try {
				fn.call(this, self.resolve.bind(self), self.reject.bind(self));
			} catch (e) {
				self.reject(e);
			}
		}, 0);
	};

	_Promise.prototype.resolve = function (value) {
		this.value = value;
		this.status = 'resolved';
		this.triggerThen();
	};
	_Promise.prototype.reject = function (reason) {
		this.value = reason;
		this.status = 'rejected';
		this.triggerThen();
	};
	_Promise.prototype.then = function (onResolve, onReject) {
		this.thenCache.push({ onResolve: onResolve, onReject: onReject });
		return this;
	};
	_Promise.prototype.catch = function (fn) {
		if (typeof fn === 'function') {
			this.errorHandle = fn;
		}
	};
	_Promise.prototype.triggerThen = function () {
		var current = this.thenCache.shift(),
		    res;
		if (!current && this.status === 'resolved') {
			return this;
		} else if (!current && this.status === 'rejected') {
			if (this.errorHandle) {
				this.value = this.errorHandle.call(undefined, this.value);
				this.status = 'resolved';
			}
			return this;
		};
		if (this.status === 'resolved') {
			res = current.onResolve;
		} else if (this.status === 'rejected') {
			res = current.onReject;
		}
		if (typeof res === "function") {
			try {
				this.value = res.call(undefined, this.value);
				this.status = 'resolved';
				this.triggerThen();
			} catch (e) {
				this.status = 'rejected';
				this.value = e;
				return this.triggerThen();
			}
		} else {
			this.triggerThen();
		}
	};
	window.Promise = _Promise;
}