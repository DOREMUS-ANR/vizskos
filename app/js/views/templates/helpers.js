const runtime = require("handlebars/runtime").default;

runtime.registerHelper('label_with_language', function(labels, language) {
  var filteredLabels;
  //if a language is specified
  if (language) {
    filteredLabels = labels.filter(function(element) {
      return element["@language"] === language;
    });
    if (filteredLabels[0]) return filteredLabels[0]["@value"];
  }

  //otherwise get "pivot" element, the only one which is a string

  filteredLabels = labels.filter(function(element) {
    return typeof element === "string";
  });
  return filteredLabels[0];

});

runtime.registerHelper('translation_language', function(labelObject) {
  if (!labelObject) return;
  //specific to MIMO thesaurus, pivot language has no language attribute
  //(it's a convention, not a real language)
  if (typeof labelObject === "string") return "pivot";
  return labelObject["@language"];
});

runtime.registerHelper('translation_label', function(labelObject) {
  if (!labelObject) return;
  //specific to MIMO thesaurus, pivot language has no language attribute
  //(it's a convention, not a real language)
  if (typeof labelObject === "string") return labelObject;
  return labelObject["@value"];
});

runtime.registerHelper('properties_list', function(property) {
  if (Array.isArray(property)) return property;
  return [property];
});

runtime.registerHelper('process_uri', function(uri) {
  if (!uri) return;
  return window.application.processUri(uri);
});

runtime.registerHelper('name_with_uri', function(uri) {
  if (!uri) return;
  return window.application.collection.getNameWithUri(uri);
});

runtime.registerHelper('is_internal_link', function(uri) {
  if (!uri) return;
  if (window.application.collection.matchAnyThesaurus(uri)) {
    return " class='link'";
  } else {
    return " target='_blank'";
  }
});
