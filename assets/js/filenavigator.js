(function(angular) {
    "use strict";
    angular.module('FileManagerApp').service('fileNavigator', [
        '$http', 'fileManagerConfig', 'item', function ($http, fileManagerConfig, Item) {

        $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

        var FileNavigator = function() {
            this.requesting = false;
            this.fileList = [];
            this.currentPath = [];
            this.idPath = [];//введено Олесем з метою замінити currentPath
            this.items = [];
            this.history = {};
            //this.history_a = [];//needed because sort doesn't work with objects
            this.error = '';
            this.root = this.getInitialRoot();//library[0][0];//Id of current root
            this.itemsById = []; //array of objects
            this.activeId ='';//actually Id of active element
            this.breadCrumbs = [];
            this.mainList = []; // to be shown in main (lower right) panel
            //console.log('library = ',library);
          //this.names = [];
        };

        FileNavigator.prototype.getInitialRoot = function() {
            for (var a in library) return a;
        }

        FileNavigator.prototype.currentId = function() {
             var self = this;
             return (self.idPath.length ? self.idPath[self.idPath.length-1]: '');
        }

        FileNavigator.prototype.refresh = function(success, error) {
            console.log('refresh start');
            var self = this;
            var path = self.currentPath.join('/');
            var data = {params: {
                mode: "list",
                onlyFolders: false,
                path: '/' + path,
                parent_id: self.currentId()
            }};
            self.requesting = true;
            self.fileList = [];
            self.error = '';
            $http.post(fileManagerConfig.listUrl, data).success(function(data) {
                self.fileList = [];
                //console.log('data.data = ', data.data)
                angular.forEach(data.data, function(file) {
                    //console.log('file=',file)
                    self.fileList.push(new Item(file, self.currentPath));
                    if(!self.itemsById[file.id]) {//RP
                        //console.log('1111111111111111111');
                        self.itemsById[file.id]={};
                        self.itemsById[file.id].name = file.name;
                        self.itemsById[file.id].cropable = file.cropable;
                        self.itemsById[file.id].date = file.date;
                        self.itemsById[file.id].size = file.size;
                        self.itemsById[file.id].type = file.type;
                        self.itemsById[file.id].opened = false;
                        self.itemsById[file.id].parent_id = file.parent_id;
                        //console.log('self.itemsById[file.id] = ', self.itemsById[file.id]);
                    } else {
                        //console.log('222222222222222');
                    }
                    if(file.parent_id) {
                        if(!self.itemsById[file.parent_id]) {
                            //console.log('3333333333333333333');
                            self.itemsById[file.parent_id]={};
                        }
                        if(!self.itemsById[file.parent_id].children)
                            //console.log('444444444444444444');
                            self.itemsById[file.parent_id].children = {}//Ids of children
                        self.itemsById[file.parent_id].children[file.id] = file.id;
                    }

                });
                //console.log('self.fileList=',self.fileList);
                //console.log('self.itemsById=',self.itemsById);
                self.requesting = false;
                if(!self.activeId) self.activeId = self.root;
                self.buildTree(path);

                if (data.error) {
                    self.error = data.error;
                    return typeof error === 'function' && error(data);
                }
                typeof success === 'function' && success(data);
            }).error(function(data) {
                self.requesting = false;
                typeof error === 'function' && error(data);
            });
            //console.log('self.breadCrumbs = ', self.breadCrumbs);
            console.log('refresh return from');
        };

        FileNavigator.prototype.buildTree = function(path) {
            console.log('buildTree start');
            //console.log('argument path=',path);
            var self = this;
            function recursive(parent, file, path) {
                console.log('recursive start');
                console.log('parent=', parent, 'file=', file, 'path=', path);
                //var absName = path ? (path + '/' + file.name) : file.name;
                var absName = file.name;
                console.log('absName = ', absName);
                if (parent.name.trim() && path.trim().indexOf(parent.name) !== 0) {//якщо у попереднього шляху було ім’я і воно не на початку currentPath...
                    parent.nodes = [];// ... обнулити nodes
                    console.log('nodes genullt');
                }
                if (parent.name !== path) {
                    console.log('parent.name = ',parent.name, ' but path = ', path);
                    for (var i in parent.nodes) {
                        console.log('node ', parent.nodes[i], ' goes to recursive:')
                        recursive(parent.nodes[i], file, path);
                    }
                } else {
                    console.log('parent.name = ',parent.name, ' = path = ', path);
                    for (var e in parent.nodes) {
                        console.log('node name of ', parent.nodes[e], ' will be compared with ', absName);
                        if (parent.nodes[e].name === absName) {
                            console.log('... they are equal, so return from recursive');
                            return;
                        }
                    }
                    parent.nodes.push({model: file, name: absName, nodes: []});
                    console.log('parent.nodes = ', parent.nodes);
                }
                parent.nodes = parent.nodes.sort(function(a, b) {
                    return a.name < b.name ? -1 : a.name === b.name ? 0 : 1;
                });
                console.log('parent.nodes = ', parent.nodes);
                console.log('recursive - normal return from ');
            };
            console.log('self.history=',self.history);
            //!self.history.length && self.history.push({id:self.root, name:self.itemsById[self.root].name, nodes: []});
            //!self.history.length && self.history.push({id:self.root, model:self.itemsById[self.root]});
            if(!self.history[self.root]) {
                self.history[self.root] = {id:self.root,model:self.itemsById[self.root]}
            }
            //!self.breadCrumbs.length && self.breadCrumbs.push({id:self.root, name:self.itemsById[self.root].name, nodes: []});
            !self.breadCrumbs.length && self.breadCrumbs.push({id:self.root, model:self.itemsById[self.root]});
            console.log('self.history =',self.history);
            //console.log('self.breadCrumbs =',self.breadCrumbs);
            for (var o in self.fileList) {
                var item = self.fileList[o];
                //console.log('candidat for recursive: item = ',item);
                //item.isFolder() && recursive(self.history[0], item.model, path);
            }
            self.mainList = [];
            console.log('Children before pushing',self.itemsById[self.activeId].children)
            //console.log('self.itemsById[self.activeId].children.length = ',(self.itemsById[self.activeId].children).length)
            for(var item in self.itemsById[self.activeId].children) {
                if(self.itemsById[self.activeId].children.hasOwnProperty(item)){
                    console.log('PUSHING: ', self.itemsById[item])
                    self.mainList.push({id:item, model:self.itemsById[item]});
                }
            }
            /*angular.forEach(self.itemsById[self.activeId].children, function(item) {
                console.log('PUSHING: ', item)
                self.mainList.push(item);
            });*/
            //console.log('self.mainList = ', self.mainList);
            //self.history_a = self.object2array(self.history);
            console.log('buildTree - Return from ');
        };

        //FileNavigator.prototype.folderClickByName = function(fullPath) {
        //    console.log('error. fix folderClickByName. for now id by name is not retrived')
        //    console.log(fullPath, self);
        //    var self = this;
        //    fullPath = fullPath.replace(/^\/*/g, '').split('/');
        //    self.currentPath = fullPath && fullPath[0] === "" ? [] : fullPath;
        //    self.refresh();
        //};

        /*returns index, not item itself*/
        FileNavigator.prototype.findItemById = function(id){
            var present = null;
            angular.forEach(self.items,function(element, index){
                if(id == item.model.id) {
                    present = index;
                }
            });
            return present;
        };

        FileNavigator.prototype.folderClick = function(item) {
            console.log('folderClick start');
            console.log('item=',item);
            var self = this;
            self.breadCrumbs = [];
            self.activeId = item.id;
            //console.log('Adding to breadcrumbs:');
            //console.log('self.itemsById = ',self.itemsById)

            self.breadCrumbs.push({id:self.activeId, model:self.itemsById[self.activeId]});
            var parentId = self.itemsById[self.activeId].parent_id;
            //var parentId = self.activeId;
            while(parentId && parentId != '' && parentId in self.itemsById) {
                //console.log('parentId = ', parentId);
                //console.log('Adding to breadcrumbs:');
                //console.log(self.itemsById[parentId]);
                self.breadCrumbs.push({id:parentId, model:self.itemsById[parentId]});
                parentId = self.itemsById[parentId].parent_id;
            }
            self.breadCrumbs.reverse();
            console.log('self.breadCrumbs =', self.breadCrumbs);
            //console.log('self.currentPath =', self.currentPath);
            if (item && item.model.type === 'dir') {
                self.itemsById[self.activeId].opened = !self.itemsById[self.activeId].opened;
                console.log('self.itemsById = ', self.itemsById);
                //if (self.itemsById[self.activeId].opened) {
                    console.log('self.history = ', self.history);
                    //var level = self.history[self.root];
                    //level.nodes = {};
                    var level_a = self.history[self.root];
                    level_a.nodes_a = [];//objects are more elegant, but arrays enable sorting
                    var level_item_id = self.root;
                    for(var child_id in self.itemsById[level_item_id].children) {
                        if(self.itemsById[level_item_id].children.hasOwnProperty(child_id)){
                            //console.log('adding node to history', child_id);
                            //level.nodes[child_id] = {id:child_id, model:self.itemsById[child_id]};
                            level_a.nodes_a.push({id:child_id, model:self.itemsById[child_id]});
                        }
                    }
                    //console.log('nodes = ', level.nodes);
                    //level.nodes = self.sortNodes(level.nodes); // does not help I don't know why
                    //console.log('nodes AFTER sorting: ', level.nodes);
                    //level.nodes_a = self.object2array(level.nodes);
                    //level.nodes_a.sort(function(a, b) { return a.model.name - b.model.name; });
                    self.breadCrumbs.forEach(function(level_item){
                        if(level_item.id != self.root) {
                            //level = level.nodes[level_item.id];
                            //level.nodes = {};
                            level_a.nodes_a.forEach(function(node) {
                                if(node.id == level_item.id ) {
                                    level_a = node;
                                }
                            });
                            level_a.nodes_a = [];
                            for(var child_id in self.itemsById[level_item.id].children) {
                                if(self.itemsById[level_item.id].children.hasOwnProperty(child_id)){
                                    //console.log('adding node to history', child_id);
                                    //level.nodes[child_id] = {id:child_id, model:self.itemsById[child_id]};
                                    level_a.nodes_a.push({id:child_id, model:self.itemsById[child_id]});
                                }
                            }
                            //level.nodes_a = self.object2array(level.nodes);
                            //console.log('nodes = ', level.nodes);
                            //console.log('nodes_a = ', level_a.nodes_a);
                            //level.nodes = self.sortNodes(level.nodes);//does not help I don't know why
                            //console.log('nodes AFTER sorting: ', level.nodes);
                        }
                    });
                    /*
                    self.history[self.activeId].nodes = {};
                    console.log('adding nodes to history for',self.activeId)
                    console.log('... from children', self.itemsById[self.activeId].children)

                    for(var item in self.itemsById[self.activeId].children) {
                        if(self.itemsById[self.activeId].children.hasOwnProperty(item)){
                            console.log('adding node to history', item);
                            self.history[self.activeId].nodes[item] = {id:item,model:self.itemsById[item]};
                        }
                    }*/
                    /*self.itemsById[self.activeId].children.forEach(function(item){
                            //self.history[self.activeId].nodes.push(self.itemsById[item]);
                            console.log('adding node to history', item)
                            self.history[self.activeId].nodes[item] = {id:item,model:self.itemsById[item]};
                        }
                    );*/
                    console.log('self.history = ', self.history);
                //}
                //item.opened = !item.opened;

                //self.currentPath.push(item.model.name);//must be deprecated
                /*console.log('self.currentPath =', self.currentPath);
                var present = -1;// Is node already there?
                angular.forEach(self.IdPath,function(element, index){
                    if(element == item.model.id) {
                        present = index;
                    }
                });
                if(present > -1) {
                    //console.log('splice');
                    //self.IdPath.length = present + 1;
                    //self.items.length = present + 1;
                    //self.IdPath = self.IdPath.slice(0, present);
                }   else {
                    //console.log('push');
                    //self.IdPath.push(item.model.id); // better wäre self.IdPath.push(item.model);
                    //self.items.push(item);
                    //self.names[item.model.id] = item.model.name;
                }
                */
                //removeSiblings();
                //self.IdPath.push(item.model.id);
                //console.log('self.IdPath='+self.IdPath);
                //console.log('library=',library);
                self.refresh();
            }
            console.log('folderClick return from');
        };



        FileNavigator.prototype.object2array = function(object) {
            var temp = [];
            for(var id in object) {
                if(object.hasOwnProperty(id)){
                    temp.push({id:id, model: object[id].model})
                }
            }
            return temp;
        }

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



            FileNavigator.prototype.upDir = function() {
            var self = this;
            if (self.currentPath[0]) {
                self.currentPath = self.currentPath.slice(0, -1);
                self.IdPath = self.IdPath.slice(0, -1);
                self.refresh();
            }
        };

        FileNavigator.prototype.goTo = function(index) {
            var self = this;
            self.currentPath = self.currentPath.slice(0, index + 1);
            self.IdPath = self.IdPath.slice(0, index + 1);
            self.refresh();
        };

        FileNavigator.prototype.chroot = function(index) {
            var self = this;
            self.root = index;
            self.refresh();
        };

        FileNavigator.prototype.fileNameExists = function(parent_id, fileName) {//Check in the same level only - My change. RP
            //console.log('fileNameExists start')
            var self = this;
            //console.log('fileName = ', fileName)
            //console.log('parent_id = ', parent_id)
            //console.log('self.itemsById[parent_id].children = ', self.itemsById[parent_id].children)
            var exists = false;
            for(var child_id in self.itemsById[parent_id].children) {
                if(self.itemsById[parent_id].children.hasOwnProperty(child_id)){
                    if(self.itemsById[child_id].name == fileName) {
                        exists = true;
                        break;
                    }
                }
            }
            return exists;
            //console.log('fileNameExists finish')
        };

        FileNavigator.prototype.listHasFolders = function() {
            var self = this;
            for (var item in self.fileList) {
                if (self.fileList[item].model.type === 'dir') {
                    return true;
                }
            }
        };

        return FileNavigator;
    }]);
})(angular);