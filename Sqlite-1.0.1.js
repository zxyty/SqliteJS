/** 
 * js Sqlite操作数据库类 
 * v0.0.1 缺点 异步返回需要等待
 * v0.0.2 改进 使用栈存储指令 回调执行
 * @author zxy
 */
; (function (root, factory) {
    if (typeof exports === "object" && typeof module === 'object') {
        module.exports = factory();
    } else if (typeof exports === 'object') {
        exports.Sqlite = factory();
        // } else if (typeof define === "function" && define.amd) {
        //     define([], factory);
    } else {
        root.Sqlite = factory();
    }
}(this, function () {
    if (typeof Sqlite === 'undefined') {
        var Sqlite = {};
    } else if (typeof Sqlite === 'object') {
        Sqlite = Sqlite;
    }

    /**
     * @name 继承函数
     * @param {Object} childCtor
     * @param {Object} parentCtor
     */
    Sqlite.Inherits = function (childCtor, parentCtor) {
        childCtor.prototype = Object.create(parentCtor.prototype);
        childCtor.prototype.constructor = childCtor;
    };

    // 用于保存的真正数据库连接
    var _db = null;

    /**
     * @name 数据库仓储操作类
     */
    var RepoSitiry = function () { };

    // 当前没有执行查询
    RepoSitiry.prototype.ActionEnum = {
        query: false,   // 查询中
        where: false    // where筛选中
    };

    RepoSitiry.prototype.Command = [];

    /**
     * @name 执行sql 
     * @description 回掉返回影响条数
     * @param {String} sql 
     * @param {Array} param
     * @param {Function} callback
     */
    RepoSitiry.prototype.Execute = function (sql, param, callback) {
        var _this = this;
        // 参数处理
        if (!param) {
            param = [];
        } else if (typeof param === 'function') {
            callback = param;
            param = [];
        }

        _this.Query(sql, param, function (result) {
            if (typeof callback == 'function') {
                callback(result.rowsAffected);
            }
        });
        return _this;
    };

    /**
     * @name 执行sql，回调返回sql查询对象 
     * @description 查询时，有数据返回数组，无数据返回0; 增删改时：返回影响条数(int)
     * @param {String} sql
     * @param {Array} param
     * @param {Function} callback
     */
    RepoSitiry.prototype.Query = function (sql, param, callback) {
        var _this = this;
        //参数处理  
        if (!param) {
            param = [];
        } else if (typeof param === 'function') {
            callback = param;
            param = [];
        }

        // 执行sql
        // 只有一个参数
        _this.ActionEnum.query = true;
        _db.transaction(function (tx) {
            // 四个参数: sql，替换sql中问号的数组，成功回调，出错回调
            tx.executeSql(sql, param,
                function (tx, result) {
                    _this.ActionEnum.query = false;
                    if (typeof callback === 'function') {
                        callback(result);
                    }
                }, function (tx, e) {
                    _this.ActionEnum.query = false;
                    console.log('sql error: ' + e.message);
                }
            );
        });
        return _this;
    };

    /**
     * @name 插入单条数据，回调返回rowid 
     * @param {Object} data
     * @param {Function} callback
     */
    RepoSitiry.prototype.Insert = function (data, callback, async) {
        var _this = this;
        // 参数处理
        if (typeof data !== 'object' && typeof callback === 'function') {
            callback();
            console.log("Insert Data must be a object");
            return _this;
        }

        var k = [];
        var v = [];
        var param = [];
        for (var i in data) {
            k.push(i);
            v.push('?');
            param.push(data[i]);
        }
        var sql = "INSERT INTO " + _this.Config.table_name + "(" + k.join(',') + ") VALUES (" + v.join(',') + ")";

        _this.Query(sql, param, function (result) {
            if (typeof callback === 'function') {
                callback(result.insertId);
            }
        });
        return _this;
    };

    /**
     * @name 修改数据
     * @param {Object} data
     * @param {string} key 指定数据里的主键 默认id
     * @param {any} param
     * @param {any} callback
     */
    RepoSitiry.prototype.Update = function (data, key, param, callback) {
        var _this = this;
        var table = _this.Config.table_name;
        //参数处理
        if (!param) {
            param = [];
        } else if (typeof param === 'function') {
            callback = param;
            param = [];
        }

        var keyVal = null;

        var copyData = deepExtend(data, {});

        if (data.id) {
            keyVal = data.id;
            delete copyData.id;
        } else if (key) {
            keyVal = data[key];
            delete copyData[key];
        }

        var set_info = mkSet(copyData);

        for (var i = set_info.param.length - 1; i >= 0; i--) {
            param.unshift(set_info.param[i]);
        }

        var sql = 'UPDATE ' + table + ' SET ' + set_info.sql;
        // 默认以Id去匹配
        if (key && typeof key === 'string') {
            sql += ' WHERE ' + key + ' = ' + keyVal;
        } else if (key && key instanceof Function) {
            callback = key;
            sql += ' WHERE id = ' + keyVal;
        } else {
            sql += ' WHERE id = ' + keyVal;
        }

        _this.Query(sql, param, function (result) {
            if (typeof callback === 'function') {
                callback(result.rowsAffected);
            }
        });
        return _this;
    };

    /**
     * @name 删除数据
     * @param {any} data
     * @param {any} param
     * @param {any} callback
     */
    RepoSitiry.prototype.Delete = function (data, param, callback) {
        var _this = this;
        var table = _this.Config.table_name;
        //参数处理
        if (!param) {
            param = [];
        } else if (typeof param == 'function') {
            callback = param;
            param = [];
        }

        var sql = "DELETE FROM " + table + " WHERE id = " + data.id;
        _this.Query(sql, param, function (result) {
            if (typeof callback == 'function') {
                callback(result.rowsAffected);
            }
        });
        return _this;
    };

    /**
     * 条件查询
     */
    RepoSitiry.prototype.GetAll = function (callback) {
        var _this = this;
        var commandIndex = _this.Command.length;
        _this.Command.push({
            command: 'GetAll',
            order: commandIndex,
            end: false,
            callback: null
        });
        var sql = 'SELECT * FROM ' + _this.Config.table_name;
        _this.Query(sql, function (result) {
            _this.tempData = result.rows; // {返回的是对象}
            callback && callback instanceof Function && callback(_this.tempData);
            _this.Command[commandIndex].end = true;

            // Where 命令
            if (_this.Command[commandIndex + 1] && _this.Command[commandIndex + 1].end === false) {
                _this.Command[commandIndex + 1].callback && _this.Command[commandIndex + 1].callback instanceof Function && _this.Command[commandIndex + 1].callback(_this.tempData);
            }
        });
        return _this;
    };

    /**
     * @name Where条件查询
     * @description 主要用于筛选结果操作
     * @param {Function} where 箭头函数
     * @returns
     */
    RepoSitiry.prototype.Where = function (where) {
        var _this = this;
        var commandIndex = _this.Command.length;
        _this.Command.push({
            command: 'Where',
            order: commandIndex,
            end: false,
            callback: null
        });
        if (_this.Command[commandIndex] && _this.Command[commandIndex].end === false) {
            _this.Command[commandIndex].callback = function (data) {
                // 解析过滤函数
                var filterData = [];
                for (var i = 0; i < data.length; i++) {
                    if (where(data[i])) {
                        filterData.push(data[i]);
                    }
                }
                _this.tempData = filterData;
                _this.Command[commandIndex].end = true;

                // order by 命令
                if (_this.Command[commandIndex + 1] && _this.Command[commandIndex + 1].end === false) {
                    _this.Command[commandIndex + 1].callback && _this.Command[commandIndex + 1].callback instanceof Function && _this.Command[commandIndex + 1].callback(_this.tempData);
                }
            };
        }

        return _this;
    };

    /**
     * 升序
     * @param order 排序字段
     * @description 排序参数中的字段必须为整数型或者字符串型
     */
    RepoSitiry.prototype.OrderBy = function (order) {
        var _this = this;
        var commandIndex = _this.Command.length;
        _this.Command.push({
            command: 'OrderBy',
            order: commandIndex,
            end: false,
            callback: null
        });
        if (_this.Command[commandIndex] && _this.Command[commandIndex].end === false) {
            _this.Command[commandIndex].callback = function (data) {
                data.sort(function(a, b){
                    if (a[order] > b[order]) {
                        return 1;
                    } else if (a[order] == b[order]) {
                        return 0;
                    } else {
                        return -1;
                    }
                });
                _this.tempData = data;
                _this.Command[commandIndex].end = true;

                // Skip 命令
                if (_this.Command[commandIndex + 1] && _this.Command[commandIndex + 1].end === false) {
                    _this.Command[commandIndex + 1].callback && _this.Command[commandIndex + 1].callback instanceof Function && _this.Command[commandIndex + 1].callback(_this.tempData);
                }
            };
        }
        return _this;
    };

    /**
     * 降序
     */
    RepoSitiry.prototype.OrderByDesc = function (order) {
        var _this = this;
        var commandIndex = _this.Command.length;
        _this.Command.push({
            command: 'OrderByDesc',
            order: commandIndex,
            end: false,
            callback: null
        });
        if (_this.Command[commandIndex] && _this.Command[commandIndex].end === false) {
            _this.Command[commandIndex].callback = function (data) {
                data.sort(function(a, b){
                    if (a[order] > b[order]) {
                        return -1;
                    } else if (a[order] == b[order]) {
                        return 0;
                    } else {
                        return 1;
                    }
                });
                _this.tempData = data;
                _this.Command[commandIndex].end = true;

                // Skip 命令
                if (_this.Command[commandIndex + 1] && _this.Command[commandIndex + 1].end === false) {
                    _this.Command[commandIndex + 1].callback && _this.Command[commandIndex + 1].callback instanceof Function && _this.Command[commandIndex + 1].callback(_this.tempData);
                }
            };
        }
        return _this;
    };

    /**
     * @name 跳过多少条记录
     * @param {Int} num 
     */
    RepoSitiry.prototype.Skip = function (num) {
        var _this = this;
        var commandIndex = _this.Command.length;
        _this.Command.push({
            command: 'Skip',
            order: commandIndex,
            end: false,
            callback: null
        });
        _this.skip_ = num;
        if (_this.Command[commandIndex] && _this.Command[commandIndex].end === false) {
            _this.Command[commandIndex].callback = function (data) {
                if (_this.skip_ && _this.skip_ >= 0 && _this.skip_ <= _this.tempData.length) {
                    _this.tempData = _this.tempData.slice(_this.skip_, _this.tempData.length);
                    delete _this.skip_;
                }
                _this.Command[commandIndex].end = true;

                // Take 命令
                if (_this.Command[commandIndex + 1] && _this.Command[commandIndex + 1].end === false) {
                    _this.Command[commandIndex + 1].callback && _this.Command[commandIndex + 1].callback instanceof Function && _this.Command[commandIndex + 1].callback(_this.tempData);
                }
            }
        }
        return this;
    };

    /**
     * @name 取出多少条记录
     * @param {Int} num 
     */
    RepoSitiry.prototype.Take = function (num) {
        var _this = this;
        var commandIndex = _this.Command.length;
        _this.Command.push({
            command: 'Take',
            order: commandIndex,
            end: false,
            callback: null
        });
        _this.take_ = num;
        if (_this.Command[commandIndex] && _this.Command[commandIndex].end === false) {
            _this.Command[commandIndex].callback = function (data) {
                if (_this.take_ && _this.take_ >= 0) {
                    _this.tempData = _this.tempData.slice(0, _this.take_);
                    delete _this.take_;
                }
                _this.Command[commandIndex].end = true;

                // toAarray() 命令 也最好使用回调 
                if (_this.Command[commandIndex + 1] && _this.Command[commandIndex + 1].end === false) {
                    _this.Command[commandIndex + 1].callback && _this.Command[commandIndex + 1].callback instanceof Function && _this.Command[commandIndex + 1].callback(_this.tempData);
                }
            }
        }
        return this;
    };

    /**
     * @name 返回取出的数据库行记录数据
     * @param 回调返回数据到参数里
     */
    RepoSitiry.prototype.ToArray = function (callback) {
        var _this = this;
        var commandIndex = _this.Command.length;
        _this.Command.push({
            command: 'ToArray',
            order: commandIndex,
            end: false,
            callback: null
        });
        if (_this.Command[commandIndex] && _this.Command[commandIndex].end === false) {
            _this.Command[commandIndex].callback = function (data) {
                _this.Command[commandIndex].end = true;
                callback && callback instanceof Function && callback(data);
            }
        }
    };

    /**
     * @name 回调获取表的记录行数
     */
    RepoSitiry.prototype.Count = function (callback) {
        var _this = this;
        var table = _this.Config.table_name;

        var sql = "SELECT COUNT(*) FROM " + table;
        _this.Query(sql, [], function (result) {
            if (typeof callback == 'function') {
                callback(result.rowsAffected);
            }
        });
        return _this;
    };

    /**
     * @name 数据库类
     * @description 构造函数 用于打开数据库连接
     * @param {Object} options
     * @parval {String} options.db_name 数据库名
     * @parval {String} options.db_size 分配的数据库大小
     */
    Sqlite.DB = function (options) {
        options = options || {};
        var _this = this;
        _this.Config = deepExtend(this.Config, options);

        if (openDatabase && openDatabase instanceof Function) {
            // 打开数据库
            _db = openDatabase(_this.Config.db_name, _this.Config.db_version, _this.Config.db_remark, _this.Config.db_size);
            _this.Config.db_inited = true;

            return this;
        } else {
            console.log('你的当前环境不支持WebSql');
            return false;
        }

    };

    // 数据库默认配置
    Sqlite.DB.prototype.Config = {
        db_name: 'sqlite',              //数据库名
        db_size: 1024 * 1024 * 2,       //数据库大小4M
        db_version: '1.0',              //数据库版本号
        db_remark: 'xyac sqlite',       //对数据库描述
        db_tables: {},                  //当前数据库存在的表
        db_inited: false                //是否已经初始化了
    };

    /**
     * @name 创建数据库表
     * @description 不需要传递id 会自动将id注册到表中 自增长 integer primary key autoincrement 
     * @param {String} table_name
     * @param {Array} table.field table.type table.addition 字段
     */
    Sqlite.DB.prototype.CreateTable = function (table_name, table) {
        var _this = this;

        // 查询到已存在的所有的表
        _this.Query('SELECT * from sqlite_master where type="table"', function (result) {
            // 找到所有已经存在的表
            _this.Config.db_tables = {};
            for (var key in result.rows) {
                _this.Config.db_tables[result.rows[key].name] = true;
            }

            // 判断是否之前存在过这个表
            if (_this.Config.db_tables[table_name]) {
                console.log('database has existed this table: ' + table_name);
                return false;
            }

            var sql = 'CREATE TABLE ' + table_name + ' ( id integer primary key autoincrement , ';

            // var sql = 'CREATE TABLE ' + table_name + ' (';

            if (typeof table.length === 'undefined') {
                table = [table];
            }

            for (var i = 0; i < table.length; i++) {
                sql += table[i].field + ' ' + table[i].type + ' ' + (table[i].addition ? table[i].addition : '') + ' , '
            }

            sql += ')';
            // 去掉最后一个逗号字符
            sql = sql.slice(0, sql.lastIndexOf(',')) + sql.slice(sql.lastIndexOf(',') + 1, sql.length);

            // 保存这张表
            var ret = _this.Execute(sql, function (result) {
                _this.Config.db_tables[table_name] = true;
            });

        });
        return _this;
    };

    /**
     * @name 销毁表
     * @param {String} table_name
     */
    Sqlite.DB.prototype.DropTable = function (table_name) {
        var _this = this;

        _this.Query('SELECT * from sqlite_master where type="table"', function (result) {
            // 找到所有已经存在的表
            _this.Config.db_tables = {};
            for (var key in result.rows) {
                _this.Config.db_tables[result.rows[key].name] = true;
            }

            // 判断是否之前存在过这个表
            if (!_this.Config.db_tables[table_name]) {
                console.log('没有 ' + table_name + ' 此表');
                return false;
            }

            var sql = 'DROP TABLE ' + table_name;
            _this.Execute(sql, function (result) {
                delete _this.Config.db_tables[table_name];
            });

        });
        return _this;
    };

    /**
     * @name 执行sql 
     * @description 回调返回影响条数
     * @param {String} sql 
     * @param {Array} param
     * @param {Function} callback
     */
    Sqlite.DB.prototype.Execute = function (sql, param, callback) {
        var _this = this;
        // 参数处理
        if (!param) {
            param = [];
        } else if (typeof param === 'function') {
            callback = param;
            param = [];
        }

        _this.Query(sql, param, function (result) {
            if (typeof callback == 'function') {
                callback(result.rowsAffected);
            }
        });
        return _this;
    };

    /**
     * @name 执行sql查询，回调返回sql查询对象 
     * @description 查询时，有数据返回数组，无数据返回0; 增删改时：返回影响条数(int)
     * @param {String} sql
     * @param {Array} param
     * @param {Function} callback
     */
    Sqlite.DB.prototype.Query = function (sql, param, callback) {
        var _this = this;
        //参数处理  
        if (!param) {
            param = [];
        } else if (typeof param === 'function') {
            callback = param;
            param = [];
        }

        // 执行sql
        // 只有一个参数
        _db.transaction(function (tx) {
            // 四个参数: sql，替换sql中问号的数组，成功回调，出错回调 
            tx.executeSql(sql, param
                , function (tx, result) {
                    if (typeof callback === 'function') {
                        callback(result);
                    }
                }, function (tx, e) {
                    console.log('sql error: ' + e.message);
                }
            );
        });
        return _this;
    };

    /**
     * @name 仓储
     * @description 用于获取一个数据库表的操作权限
     * @param {String} table_name
     */
    Sqlite.DB.prototype.Repository = function (table_name) {
        // 返回一个表的实体操作对象
        return new Table.Repo(table_name);
    };


    var Table = {};
    /**
     * @name 获取或者创建一个关联表操作的对象
     * @description 表继承了Event类
     * @param {any} table_name
     */
    Table.Repo = function (table_name) {
        this.Config.table_name = table_name || '';
    };
    // Table集成Event
    Sqlite.Inherits(Table.Repo, RepoSitiry);

    // 表的配置
    Table.Repo.prototype.Config = {
        table_name: ''
    };

    /**
     * @name 深复制对象
     * @param {object} target
     * @param {object} options
     */
    function deepExtend(target, options) {
        for (name in options) {
            var copy = options[name];
            if (copy instanceof Array) {
                target[name] = arguments.callee([], copy);
            } else if (copy instanceof Object) {
                target[name] = arguments.callee({}, copy);
            } else {
                target[name] = options[name];
            }
        }
        return target;
    }

    /**
     * @name 构造查询where语句
     * @param {Object} data
     * @returns
     */
    function mkWhere(data) {
        var arr = [];
        var param = [];
        if (typeof data === 'object' && typeof data.length === 'undefined') {
            for (var i in data) {
                arr.push(i + "=?");
                param.push(data[i]);
            }
        }
        return {
            sql: arr.join(' AND '),
            param: param
        };
    }

    /**
     * @name 构造更新Set语句
     * @param {Object} data
     * @returns
     */
    function mkSet(data) {
        var arr = [];
        var param = [];
        if (typeof data === 'object' && typeof data.length === 'undefined') {
            for (var i in data) {
                arr.push(i + "=?");
                param.push(data[i]);
            }
        }
        return {
            sql: arr.join(' , '),
            param: param
        };
    }

    /**
     * @name 获取数组里对应的元组
     * @param {Object} arr
     * @param {String} attrname
     * @param {any} attrvalue
     * @returns
     */
    function getEleInObjArrByAttr(arr, attrname, attrvalue) {
        for (var i = 0, len = arr.length; i < len; i++) {
            if (!arr[i][attrname] || typeof arr[i][attrname] !== "object") {
                if (arr[i][attrname] === attrvalue) {
                    return {
                        index: i,
                        attr: arr[i]
                    };
                }
            }
        }
        return false;
    }

    return Sqlite;
}));