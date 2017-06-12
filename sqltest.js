// sqlite 测试
// 打开数据库
var SqlDB = new Sqlite.DB();

// SqlDB.DropTable('student');

// 新建表
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

// 创建一个仓储
var _studentRepo = SqlDB.Repository('student');

// _studentRepo.Insert({
//     name: 'zxy',
//     age: '20'
// });

_studentRepo.GetAll().Where(c => c.name == "zxy").OrderByDesc("id").ToArray(function(data){
    console.log(data);
});


_studentRepo.Count(function(result) {
    console.log(result);
});