var
	path = require('path'),
	ExternalsPlugin = require('webpack/lib/ExternalsPlugin'),
	DelegatedSourceDependency = require('webpack/lib/dependencies/DelegatedSourceDependency'),
	DelegatedModule = require('webpack/lib/DelegatedModule');

function DelegatedEnactFactoryPlugin(options) {
	this.options = options || {};
}
DelegatedEnactFactoryPlugin.prototype.apply = function(normalModuleFactory) {
	var name = this.options.name;
	var libs = this.options.libraries;
	normalModuleFactory.plugin('factory', function(factory) {
		return function(data, callback) {
			var request = data.dependency.request;
			for(var i=0; i<libs.length; i++) {
				if(request && request.indexOf(libs[i]) === 0) {
					return callback(null, new DelegatedModule(name, request, 'require', request));
				}
			}
			return factory(data, callback);
		};
	});
};

function EnactFrameworkRefPlugin(opts) {
	this.options = opts || {};
	this.options.name = this.options.name || 'enact_framework';
	this.options.libraries = this.options.libraries || ['@enact', 'react', 'react-dom'];
	this.options.external = this.options.external || {};
	this.options.external.inject = this.options.external.inject || this.options.external.path;

	if(!process.env.ILIB_LOCALE_PATH) {
		process.env.ILIB_LOCALE_PATH = path.join(this.options.external.inject, 'node_module',
				'@enact', 'i18n', 'ilib', 'locale');
	}
}
module.exports = EnactFrameworkRefPlugin;
EnactFrameworkRefPlugin.prototype.apply = function(compiler) {
	var name = this.options.name;
	var libs = this.options.libraries;
	var external = this.options.external;

	var externals = {};
	externals[name] = name;
	compiler.apply(new ExternalsPlugin('var', externals));

	compiler.plugin('compilation', function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;
		compilation.dependencyFactories.set(DelegatedSourceDependency, normalModuleFactory);

		compilation.plugin('html-webpack-plugin-before-html-processing', function(params, callback) {
			params.assets.js.unshift(path.join(external.inject, 'enact.js'));
			params.assets.css.unshift(path.join(external.inject, 'enact.css'));
			params.plugin.options.external = external;
			callback();
		});
	});
	compiler.plugin('compile', function(params) {
		params.normalModuleFactory.apply(new DelegatedEnactFactoryPlugin({
			name: name,
			libraries: libs,
		}));
	});
};
