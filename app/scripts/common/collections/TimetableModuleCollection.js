define([
    'underscore',
    'backbone',
    'nusmods',
    'common/collections/ModuleCollection',
    '../models/LessonModel',
    '../collections/LessonCollection'
  ],
  function (_, Backbone, NUSMods, ModuleCollection, LessonModel,
            LessonCollection) {
    'use strict';

    return ModuleCollection.extend({
      initialize: function (models, options) {
        this.colors = [];
        this.timetable = options.timetable;

        this.on('add', this.onAdd, this);
        this.on('remove', this.onRemove, this);
      },

      onAdd: function (module, collection, options) {
        if (!this.colors.length) {
          this.colors = [0, 1, 2, 3, 4, 5, 6, 7];
        }
        var color = this.colors.splice(Math.floor(Math.random() * this.colors.length), 1)[0];
        module.set('color', color);

        NUSMods.getMod(module.id).then(_.bind(function (mod) {
          var selectedLessons = options.selectedLessons;
          var lessons = new LessonCollection();
          module.set('lessons', lessons);
          _.each(_.groupBy(mod.Timetable, 'LessonType'), function (groups) {
            var uniqueClassNos = _.uniq(_.pluck(groups, 'ClassNo'));
            var randomClassNo = _.sample(uniqueClassNos);
            var isDraggable = _.size(uniqueClassNos) > 1;
            var sameType = new LessonCollection();
            _.each(_.groupBy(groups, 'ClassNo'), function (lessonsData) {
              var sameGroup = new LessonCollection();
              _.each(lessonsData, function (lessonData) {
                var lesson = new LessonModel(_.extend({
                  color: color,
                  display: true,
                  isDraggable: isDraggable,
                  ModuleCode: mod.ModuleCode,
                  ModuleTitle: mod.ModuleTitle,
                  sameGroup: sameGroup,
                  sameType: sameType
                }, lessonData));
                lessons.add(lesson);
                sameGroup.add(lesson);
                sameType.add(lesson);
                if (!selectedLessons && lessonData.ClassNo === randomClassNo) {
                  this.timetable.add(lesson);
                }
              }, this);
            }, this);
          }, this);
          _.each(selectedLessons, function (lesson) {
            this.timetable.add(lessons.where(lesson));
          }, this);
          this.timetable.trigger('change');
        }, this));
      },

      onRemove: function (module) {
        this.timetable.remove(this.timetable.where({ModuleCode: module.id}));
      },

      toJSON: function () {
        return this.map(function (module) {
          return {
            ModuleCode: module.id,
            selectedLessons: _.chain(this.timetable.where({ModuleCode: module.id}))
              .map(function (lesson) {
                return lesson.pick('ClassNo', 'LessonType');
              })
              .uniq('LessonType')
              .value()
          };
        }, this);
      }
    });
  });
