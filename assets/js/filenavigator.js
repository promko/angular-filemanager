(function (angular) {
  "use strict";
  angular.module('FileManagerApp').service('fileNavigator', [
    '$http', 'fileManagerConfig', 'item', function ($http, fileManagerConfig, Item) {

      $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

      var FileNavigator = function () {
        this.requesting = false;
        //this.fileList = [];
        //this.currentPath = [];
        //this.idPath = [];//введено Олесем з метою замінити currentPath
        //this.items = [];
        this.history = {};//is a base for the tree, shown in sidebar - one-thread version
        this.historyWide = {};//is a base for the tree, shown in sidebar
        //this.history_a = [];//needed because sort doesn't work with objects
        this.error = '';
        this.root = this.getInitialRoot();//library[0][0];//Id of current root
        this.itemsById = []; //array of objects
        this.activeId = '';//actually Id of active element
        this.breadCrumbs = [];
        this.mainList = []; // to be shown in main (lower right) panel
        //console.log('library = ',library);
        //this.names = [];
      };

      FileNavigator.prototype.getInitialRoot = function () {
        for (var a in library) return a;
      };
      /*
       FileNavigator.prototype.currentId = function() {
       var self = this;
       return (self.idPath.length ? self.idPath[self.idPath.length-1]: '');
       }
       */
      FileNavigator.prototype.refresh = function (success, error) {
        console.log('refresh start');
        var self = this;
        //var path = self.currentPath.join('/');
        var data = {
          params: {
            mode: "list",
            onlyFolders: false
            //path: '/' + path,
            //parent_id: self.currentId()
          }
        };
        self.requesting = true;
        self.error = '';
        $http.post(fileManagerConfig.listUrl, data).success(function (data) {
          //console.log('data.data = ', data.data)
          angular.forEach(data.data, function (file) {
            if (!self.itemsById[file.id]) {//RP
              //console.log('file.id = ', file.id);
              self.itemsById[file.id] = {};
              self.itemsById[file.id].name = file.name;
              self.itemsById[file.id].cropable = file.cropable;
              self.itemsById[file.id].date = file.date;
              self.itemsById[file.id].size = file.size;
              self.itemsById[file.id].type = file.type;
              self.itemsById[file.id].opened = false;
              self.itemsById[file.id].chosen = false;
              self.itemsById[file.id].parent_id = file.parent_id;
            }
            if (file.parent_id) {
              if (!self.itemsById[file.parent_id]) {
                self.itemsById[file.parent_id] = {};
              }
              if (!self.itemsById[file.parent_id].children)
                self.itemsById[file.parent_id].children = {}//Ids of children
              self.itemsById[file.parent_id].children[file.id] = file.id;
            }

          });
          self.requesting = false;
          if (!self.activeId) self.activeId = self.root;
          console.log('self.itemsById = ', self.itemsById);
          self.buildTree();

          if (data.error) {
            self.error = data.error;
            return typeof error === 'function' && error(data);
          }
          typeof success === 'function' && success(data);
        }).error(function (data) {
          self.requesting = false;
          typeof error === 'function' && error(data);
        });
        console.log('refresh return from');
      };

      FileNavigator.prototype.buildHistory = function () {
        console.log('buildHistory start');
        var self = this;
        console.log('self.history=', self.history);
        if (!self.history[self.root]) {
          self.history[self.root] = {id: self.root, model: self.itemsById[self.root]}
        }
        if (!self.historyWide[self.root]) {
          self.historyWide[self.root] = {id: self.root, model: self.itemsById[self.root]}
        }
        //!self.breadCrumbs.length && self.breadCrumbs.push({id:self.root, model:self.itemsById[self.root]});
        console.log('self.history =', self.history);
        console.log('self.activeId =', self.activeId);
        console.log('buildHistory finish');
      };

      FileNavigator.prototype.buildMainList = function () {
        console.log('buildMainList start');
        var self = this;
        console.log('self.activeId = ', self.activeId);
        console.log('self.itemsById = ', self.itemsById);
        console.log('self.itemsById[self.activeId] = ', self.itemsById[self.activeId]);
        self.mainList = [];
        console.log('Children before pushing', self.itemsById[self.activeId].children)
        for (var item in self.itemsById[self.activeId].children) {
          if (self.itemsById[self.activeId].children.hasOwnProperty(item)) {
            console.log('PUSHING: ', self.itemsById[item])
            self.mainList.push({id: item, model: self.itemsById[item]});
          }
        }
        console.log('buildMainList finish');
      };

      FileNavigator.prototype.buildTree = function () {
        console.log('buildTree start');
        //console.log('argument path=',path);
        var self = this;
        self.buildHistory();
        //self.buildWideHistory();
        self.buildMainList();
        console.log('buildTree - Return from ');
      };

      /*returns index, not item itself*/
      /*
       FileNavigator.prototype.findItemById = function(id){
       var present = null;
       angular.forEach(self.items,function(element, index){
       if(id == item.model.id) {
       present = index;
       }
       });
       return present;
       };
       */
      FileNavigator.prototype.buildBreadCrumbs = function (item_id) {
        console.log('buildBreadCrumbs start');
        var self = this;
        console.log('item_id = ', item_id);
        item_id = typeof item_id !== 'undefined' ? item_id : self.activeId;//default value is self.activeId
        item_id = typeof item_id !== 'undefined' ? item_id : self.root;//if it is the very start
        // console.log('item_id = ', item_id);
        self.breadCrumbs = [];
        self.breadCrumbs.push({id: item_id, model: self.itemsById[item_id]});
        var parentId = self.itemsById[item_id].parent_id;
        while (parentId && parentId != '' && parentId in self.itemsById) {
          self.breadCrumbs.push({id: parentId, model: self.itemsById[parentId]});
          parentId = self.itemsById[parentId].parent_id;
        }
        self.breadCrumbs.reverse();
        console.log('self.breadCrumbs =', self.breadCrumbs);
        console.log('buildBreadCrumbs finish');
      };

      FileNavigator.prototype.buildWideHistory = function (id, wideHistoryLevel) {
        console.log('buildWideHistory start');
        var self = this;
        id = typeof id !== 'undefined' ? id : self.root;
        wideHistoryLevel = typeof wideHistoryLevel !== 'undefined' ? wideHistoryLevel : self.historyWide[self.root];
        console.log('wideHistoryLevel = ', wideHistoryLevel);
        console.log('self.historyWide = ', self.historyWide);
        var ancestor = self.itemsById[id];
        console.log('self.itemsById[id] = ', self.itemsById[id]);
        if (ancestor.type === 'dir' && ancestor.opened) {
          wideHistoryLevel.nodes_a = [];
          for (var child_id in ancestor.children) {
            if (ancestor.children.hasOwnProperty(child_id)) {
              wideHistoryLevel.nodes_a.push({id: child_id, model: self.itemsById[child_id]});
              wideHistoryLevel.nodes_a.forEach(function (node) {
                if (node.id == child_id) {
                  wideHistoryLevel = node;
                }
              });
              self.buildWideHistory(child_id, wideHistoryLevel);
            }
          }
        }
        console.log('buildWideHistory finish');
        return;
      };

      //Items from this array will be a base for Tree Building - analogisch as breadCrumbs was. But this must be wider
      //Let's go from root down until at least single node is dir+open+has_children
      /*
      FileNavigator.prototype.formArray4Tree = function () {
        var self = this;
        var treeItems = [];
        var current_id = self.root;
        var levels = [];
        var level = 0;
        levels[level] = [];
        levels[level].push(self.itemsById[current_id]);
        var nodesOnLevel = self.historyWide;
        var goDeeper = false;
        levels[level].forEach(function (ancestor) {
          if (ancestor.type === 'dir' && ancestor.opened) {
            nodesOnLevel.nodes_a = [];
            goDeeper = true; //go next level
            level++;
            for (var child_id in ancestor.children) {
              if (ancestor.children.hasOwnProperty(child_id)) {
                levels[level].push(self.itemsById[child_id]);
                nodesOnLevel.nodes_a.push({id: child_id, model: self.itemsById[child_id]})

              }
            }
          }

        });
        for (var child_id in self.itemsById[current_id].children) {
          if (self.itemsById[current_id].children.hasOwnProperty(child_id)) {

          }
        }


        if (item && item.model.type === 'dir') {
          self.itemsById[self.activeId].opened = !self.itemsById[self.activeId].opened;
          var level_a = self.history[self.root];
          level_a.nodes_a = [];//objects are more elegant, but arrays enable sorting
          var level_item_id = self.root;
          for (var child_id in self.itemsById[level_item_id].children) {
            if (self.itemsById[level_item_id].children.hasOwnProperty(child_id)) {
              level_a.nodes_a.push({id: child_id, model: self.itemsById[child_id]});
            }
          }
          self.breadCrumbs.forEach(function (level_item) {
            if (level_item.id != self.root) {
              level_a.nodes_a.forEach(function (node) {
                if (node.id == level_item.id) {
                  level_a = node;
                }
              });
              level_a.nodes_a = [];
              for (var child_id in self.itemsById[level_item.id].children) {
                if (self.itemsById[level_item.id].children.hasOwnProperty(child_id)) {
                  level_a.nodes_a.push({id: child_id, model: self.itemsById[child_id]});
                }
              }
            }
          });
          console.log('self.history = ', self.history);
          self.refresh();
        }
      };
*/
      FileNavigator.prototype.folderClick = function (item) {
        console.log('folderClick start');
        console.log('item=', item);
        var self = this;

        self.activeId = item.id;
        console.log('self.activeId = ', self.activeId);
        self.buildBreadCrumbs();
        if (item && item.model.type === 'dir') {
          self.itemsById[self.activeId].opened = !self.itemsById[self.activeId].opened;
          console.log('self.itemsById = ', self.itemsById);
          console.log('self.history = ', self.history);
          //var level = self.history[self.root];
          //level.nodes = {};
          var level_a = self.history[self.root];
          level_a.nodes_a = [];//objects are more elegant, but arrays enable sorting
          var level_item_id = self.root;
          for (var child_id in self.itemsById[level_item_id].children) {
            if (self.itemsById[level_item_id].children.hasOwnProperty(child_id)) {
              //console.log('adding node to history', child_id);
              //level.nodes[child_id] = {id:child_id, model:self.itemsById[child_id]};
              level_a.nodes_a.push({id: child_id, model: self.itemsById[child_id]});
            }
          }
          //level.nodes = self.sortNodes(level.nodes); // does not help I don't know why
          //level.nodes_a = self.object2array(level.nodes);
          //level.nodes_a.sort(function(a, b) { return a.model.name - b.model.name; });
          self.breadCrumbs.forEach(function (level_item) {
            if (level_item.id != self.root) {
              //level = level.nodes[level_item.id];
              //level.nodes = {};
              level_a.nodes_a.forEach(function (node) {
                if (node.id == level_item.id) {
                  level_a = node;
                }
              });
              level_a.nodes_a = [];
              for (var child_id in self.itemsById[level_item.id].children) {
                if (self.itemsById[level_item.id].children.hasOwnProperty(child_id)) {
                  //console.log('adding node to history', child_id);
                  //level.nodes[child_id] = {id:child_id, model:self.itemsById[child_id]};
                  level_a.nodes_a.push({id: child_id, model: self.itemsById[child_id]});
                }
              }
              //level.nodes_a = self.object2array(level.nodes);
            }
          });
          console.log('self.history = ', self.history);
          self.refresh();
        }
        console.log('folderClick return from');
      };


      /*
       FileNavigator.prototype.object2array = function(object) {
       var temp = [];
       for(var id in object) {
       if(object.hasOwnProperty(id)){
       temp.push({id:id, model: object[id].model})
       }
       }
       return temp;
       };

       FileNavigator.prototype.sortNodes = function(object) {
       var temp = [];
       var sorted = {}
       console.log('Inside sortNodes')
       console.log('object = ', object)
       for(var id in object) {
       if(object.hasOwnProperty(id)){
       temp.push({id:id, model: object[id].model})
       }
       }
       console.log('array before sort = ', temp)
       temp.sort(function(a, b) { return a.model.name - b.model.name; });
       console.log('array after sort = ', temp)
       temp.forEach(function(item) {
       console.log(item.model.name);
       sorted[item.id] = {id:item.id, model: item.model};
       })
       console.log('result object = ', sorted)
       return sorted;
       }

       */
      FileNavigator.prototype.upDir = function () {
        var self = this;
        if (self.currentPath[0]) {
          self.currentPath = self.currentPath.slice(0, -1);
          self.IdPath = self.IdPath.slice(0, -1);
          self.refresh();
        }
      };

      FileNavigator.prototype.goTo = function (index) {
        var self = this;
        self.currentPath = self.currentPath.slice(0, index + 1);
        self.IdPath = self.IdPath.slice(0, index + 1);
        self.refresh();
      };

      FileNavigator.prototype.chroot = function (index) {
        var self = this;
        self.root = index;
        self.refresh();
      };

      FileNavigator.prototype.fileNameExists = function (parent_id, fileName) {//Check in the same level only - My change. RP
        //console.log('fileNameExists start')
        var self = this;
        var exists = false;
        for (var child_id in self.itemsById[parent_id].children) {
          if (self.itemsById[parent_id].children.hasOwnProperty(child_id)) {
            if (self.itemsById[child_id].name == fileName) {
              exists = true;
              break;
            }
          }
        }
        return exists;
        //console.log('fileNameExists finish')
      };

      FileNavigator.prototype.listHasFolders = function () {
        var self = this;
        for (var item in self.fileList) {
          if (self.fileList[item].model.type === 'dir') {
            return true;
          }
        }
      };
      return FileNavigator;
    }
  ])
  ;
})
(angular);