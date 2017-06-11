## Sqlite-Js类几点说明
* 最近本着对js的学习，及前端App应用的需求，特地写了一段关于Sqlite操作数据库的简易借口，模式与EntityFramework的仓储很类似，也差不多是借鉴了它的调用思想。
* 由于我发现Sqlite执行sql语句查询时候，会异步进行，导致程序里的代码很多时候都不能按照我的逻辑进行，所以在编写此Sqlite数据库操作类时候，我没办法的采用了回调机制，希望各大大提出建议。
* 本程序Sqlite数据库操作类，会不断的更新代码，难免会有Bug，希望见谅。
## 代码的安装及使用
* 现在程序如你所见，就只有一个单纯的js，所以在你的程序里，只需要下载`Sqlite.js`文件，通过`script`标签语法引入到你的程序代码即可。
    ```html
    <script src="Sqlite.js"></script>
    ```
* 第一步：创建数据库
    ```javascript
    // 1、创建数据库(默认)
    var SqlDB = new Sqlite.DB();  // 默认不需要传递参数
    
    // 2、自定义
    var SqlDB = new Sqlite.DB({
        db_name: '',
        db_size: '',
        db_version: '',
        db_remark: ''
    });
    ```
    参数     | 注释
    ------- | -------
    db_name: 'sqlite', | //数据库名
    db_size: 1024 * 1024 * 2, | //数据库大小2M
    db_version: '1.0', | //数据库版本号
    db_remark: 'sqlite', | //对数据库描述

* 第二步：创建表
    ```javascript
    SqlDB.CreateTable('student',[
        {
            field: 'name',
            type: 'NVARCHAR(25)'
            //addition: ''  额外信息
        },
        {
            field: 'age',
            type: 'INTEGER'
        }
    ]);
    ```
    * 创建表默认会以id（int类型）作为自增长的主键

    * 创建表 字段数据类型参考

    表1:
    存储类 | 描述
    ----|---
    NULL | 值是一个 NULL 值。
    INTEGER | 值是一个带符号的整数，根据值的大小存储在 1、2、3、4、6 或 8 字节中。
    REAL | 值是一个浮点值，存储为 8 字节的 IEEE 浮点数字。
    TEXT | 值是一个文本字符串，使用数据库编码（UTF-8、UTF-16BE 或 UTF-16LE）存储。
    BLOB | 值是一个 blob 数据，完全根据它的输入存储。
    表2:
    亲和类型 | 描述
    -----|---
    TEXT | 数值型数据在被插入之前，需要先被转换为文本格式，之后再插入到目标字段中。
    NUMERIC | 当文本数据被插入到亲缘性为NUMERIC的字段中时，如果转换操作不会导致数据信息丢失以及完全可逆，那么SQLite就会将该文本数据转换为INTEGER或REAL类型的数据，如果转换失败，SQLite仍会以TEXT方式存储该数据。对于NULL或BLOB类型的新数据，SQLite将不做任何转换，直接以NULL或BLOB的方式存储该数据。需要额外说明的是，对于浮点格式的常量文本，如"30000.0"，如果该值可以转换为INTEGER同时又不会丢失数值信息，那么SQLite就会将其转换为INTEGER的存储方式。
    INTEGER | 对于亲缘类型为INTEGER的字段，其规则等同于NUMERIC，唯一差别是在执行CAST表达式时。
    REAL | 其规则基本等同于NUMERIC，唯一的差别是不会将"30000.0"这样的文本数据转换为INTEGER存储方式。
    NONE | 不做任何的转换，直接以该数据所属的数据类型进行存储。

  数据类型：

    `INTEGER`
    *   INT
    *   INTEGER
    *   TINYINT
    *   SMALLINT
    *   MEDIUMINT
    *   BIGINT
    *   UNSIGNED BIG INT
    *   INT2
    *   INT8
    
    `TEXT`
    *   CHARACTER(20)
    *   VARCHAR(255)
    *   VARYING CHARACTER(255)
    *   NCHAR(55)
    *   NATIVE CHARACTER(70)
    *   NVARCHAR(100)
    *   TEXT
    *   CLOB

    `NONE`
    *   BLOB
    *   no datatype specified

    `REAL`
    *   REAL
    *   DOUBLE
    *   DOUBLE PRECISION
    *   FLOAT

    `NUMERIC`
    *   NUMERIC
    *   DECIMAL(10,5)
    *   BOOLEAN
    *   DATE
    *   DATETIME

* 第四步：插入记录
    ```javascript
    // 创建一个仓储
    var _studentRepo = SqlDB.Repository('student');

    _studentRepo.Insert({
         name: 'zxy',
         age: '20'
    });
    ```
* 第五步：获取数据
    ```javascript
    // 类似EF的写法格式
    _studentRepo.GetAll().Where(c => c.name == "zxy").OrderByDesc("id").ToArray(function(data){
        console.log(data);
    });

    _studentRepo.Count(function(result) {
        console.log(result);
    });
    ```

## Sqlite数据库仓储借口
* Insert
* Update
* Delete
* GetAll
* Where
* OrderBy/OrderByDesc
* Skip
* Take
* ToArray
* Count

## 关于作者
```javascript
  var zxyty = {
    nickName  : "zxy",
    site : "http://www.zxyty.com",
    webSite: "码客库"
  };
```
