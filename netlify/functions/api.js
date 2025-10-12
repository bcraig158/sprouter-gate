const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { DateTime } = require('luxon');
const crypto = require('crypto');
const secureStorage = require('./secureStorage');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || '86d2bbcb5cd6a7b84f1e84473a95c976fd1febc5955da91779765d8df109304812e3c2b6410eb4c92cfa524f17e0263649f3b164297c0c94dcc0798682f1c8fe';

// Force redeploy - function updated

// In-memory data for production (serverless-friendly)
const students = [
  { student_id: '33727', household_id: 'HH_33727' },
  { student_id: '39444', household_id: 'HH_39444' },
  { student_id: '39697', household_id: 'HH_39697' },
  { student_id: '39522', household_id: 'HH_39522' },
  { student_id: '39459', household_id: 'HH_39459' },
  { student_id: '39498', household_id: 'HH_39498' },
  { student_id: '39438', household_id: 'HH_39438' },
  { student_id: '39541', household_id: 'HH_39541' },
  { student_id: '39463', household_id: 'HH_39463' },
  { student_id: '39645', household_id: 'HH_39645' },
  { student_id: '39394', household_id: 'HH_39394' },
  { student_id: '39720', household_id: 'HH_39720' },
  { student_id: '39769', household_id: 'HH_39769' },
  { student_id: '39513', household_id: 'HH_39513' },
  { student_id: '39651', household_id: 'HH_39651' },
  { student_id: '39637', household_id: 'HH_39637' },
  { student_id: '39524', household_id: 'HH_39524' },
  { student_id: '39461', household_id: 'HH_39461' },
  { student_id: '39448', household_id: 'HH_39448' },
  { student_id: '38990', household_id: 'HH_38990' },
  { student_id: '39519', household_id: 'HH_39519' },
  { student_id: '39450', household_id: 'HH_39450' },
  { student_id: '39525', household_id: 'HH_39525' },
  { student_id: '39526', household_id: 'HH_39526' },
  { student_id: '39527', household_id: 'HH_39527' },
  { student_id: '39528', household_id: 'HH_39528' },
  { student_id: '39529', household_id: 'HH_39529' },
  { student_id: '39530', household_id: 'HH_39530' },
  { student_id: '39531', household_id: 'HH_39531' },
  { student_id: '39532', household_id: 'HH_39532' },
  { student_id: '39533', household_id: 'HH_39533' },
  { student_id: '39534', household_id: 'HH_39534' },
  { student_id: '39535', household_id: 'HH_39535' },
  { student_id: '39536', household_id: 'HH_39536' },
  { student_id: '39537', household_id: 'HH_39537' },
  { student_id: '39538', household_id: 'HH_39538' },
  { student_id: '39539', household_id: 'HH_39539' },
  { student_id: '39540', household_id: 'HH_39540' },
  { student_id: '39542', household_id: 'HH_39542' },
  { student_id: '39543', household_id: 'HH_39543' },
  { student_id: '39544', household_id: 'HH_39544' },
  { student_id: '39545', household_id: 'HH_39545' },
  { student_id: '39546', household_id: 'HH_39546' },
  { student_id: '39547', household_id: 'HH_39547' },
  { student_id: '39548', household_id: 'HH_39548' },
  { student_id: '39549', household_id: 'HH_39549' },
  { student_id: '39550', household_id: 'HH_39550' },
  { student_id: '39551', household_id: 'HH_39551' },
  { student_id: '39552', household_id: 'HH_39552' },
  { student_id: '39553', household_id: 'HH_39553' },
  { student_id: '39554', household_id: 'HH_39554' },
  { student_id: '39555', household_id: 'HH_39555' },
  { student_id: '39556', household_id: 'HH_39556' },
  { student_id: '39557', household_id: 'HH_39557' },
  { student_id: '39558', household_id: 'HH_39558' },
  { student_id: '39559', household_id: 'HH_39559' },
  { student_id: '39560', household_id: 'HH_39560' },
  { student_id: '39561', household_id: 'HH_39561' },
  { student_id: '39562', household_id: 'HH_39562' },
  { student_id: '39563', household_id: 'HH_39563' },
  { student_id: '39564', household_id: 'HH_39564' },
  { student_id: '39565', household_id: 'HH_39565' },
  { student_id: '39566', household_id: 'HH_39566' },
  { student_id: '39567', household_id: 'HH_39567' },
  { student_id: '39568', household_id: 'HH_39568' },
  { student_id: '39569', household_id: 'HH_39569' },
  { student_id: '39570', household_id: 'HH_39570' },
  { student_id: '39571', household_id: 'HH_39571' },
  { student_id: '39572', household_id: 'HH_39572' },
  { student_id: '39573', household_id: 'HH_39573' },
  { student_id: '39574', household_id: 'HH_39574' },
  { student_id: '39575', household_id: 'HH_39575' },
  { student_id: '39576', household_id: 'HH_39576' },
  { student_id: '39577', household_id: 'HH_39577' },
  { student_id: '39578', household_id: 'HH_39578' },
  { student_id: '39579', household_id: 'HH_39579' },
  { student_id: '39580', household_id: 'HH_39580' },
  { student_id: '39581', household_id: 'HH_39581' },
  { student_id: '39582', household_id: 'HH_39582' },
  { student_id: '39583', household_id: 'HH_39583' },
  { student_id: '39584', household_id: 'HH_39584' },
  { student_id: '39585', household_id: 'HH_39585' },
  { student_id: '39586', household_id: 'HH_39586' },
  { student_id: '39587', household_id: 'HH_39587' },
  { student_id: '39588', household_id: 'HH_39588' },
  { student_id: '39589', household_id: 'HH_39589' },
  { student_id: '39590', household_id: 'HH_39590' },
  { student_id: '39591', household_id: 'HH_39591' },
  { student_id: '39592', household_id: 'HH_39592' },
  { student_id: '39593', household_id: 'HH_39593' },
  { student_id: '39594', household_id: 'HH_39594' },
  { student_id: '39595', household_id: 'HH_39595' },
  { student_id: '39596', household_id: 'HH_39596' },
  { student_id: '39597', household_id: 'HH_39597' },
  { student_id: '39598', household_id: 'HH_39598' },
  { student_id: '39599', household_id: 'HH_39599' },
  { student_id: '39600', household_id: 'HH_39600' },
  { student_id: '39601', household_id: 'HH_39601' },
  { student_id: '39602', household_id: 'HH_39602' },
  { student_id: '39603', household_id: 'HH_39603' },
  { student_id: '39604', household_id: 'HH_39604' },
  { student_id: '39605', household_id: 'HH_39605' },
  { student_id: '39606', household_id: 'HH_39606' },
  { student_id: '39607', household_id: 'HH_39607' },
  { student_id: '39608', household_id: 'HH_39608' },
  { student_id: '39609', household_id: 'HH_39609' },
  { student_id: '39610', household_id: 'HH_39610' },
  { student_id: '39611', household_id: 'HH_39611' },
  { student_id: '39612', household_id: 'HH_39612' },
  { student_id: '39613', household_id: 'HH_39613' },
  { student_id: '39614', household_id: 'HH_39614' },
  { student_id: '39615', household_id: 'HH_39615' },
  { student_id: '39616', household_id: 'HH_39616' },
  { student_id: '39617', household_id: 'HH_39617' },
  { student_id: '39618', household_id: 'HH_39618' },
  { student_id: '39619', household_id: 'HH_39619' },
  { student_id: '39620', household_id: 'HH_39620' },
  { student_id: '39621', household_id: 'HH_39621' },
  { student_id: '39622', household_id: 'HH_39622' },
  { student_id: '39623', household_id: 'HH_39623' },
  { student_id: '39624', household_id: 'HH_39624' },
  { student_id: '39625', household_id: 'HH_39625' },
  { student_id: '39626', household_id: 'HH_39626' },
  { student_id: '39627', household_id: 'HH_39627' },
  { student_id: '39628', household_id: 'HH_39628' },
  { student_id: '39629', household_id: 'HH_39629' },
  { student_id: '39630', household_id: 'HH_39630' },
  { student_id: '39631', household_id: 'HH_39631' },
  { student_id: '39632', household_id: 'HH_39632' },
  { student_id: '39633', household_id: 'HH_39633' },
  { student_id: '39634', household_id: 'HH_39634' },
  { student_id: '39635', household_id: 'HH_39635' },
  { student_id: '39636', household_id: 'HH_39636' },
  { student_id: '39638', household_id: 'HH_39638' },
  { student_id: '39639', household_id: 'HH_39639' },
  { student_id: '39640', household_id: 'HH_39640' },
  { student_id: '39641', household_id: 'HH_39641' },
  { student_id: '39642', household_id: 'HH_39642' },
  { student_id: '39643', household_id: 'HH_39643' },
  { student_id: '39644', household_id: 'HH_39644' },
  { student_id: '39646', household_id: 'HH_39646' },
  { student_id: '39647', household_id: 'HH_39647' },
  { student_id: '39648', household_id: 'HH_39648' },
  { student_id: '39649', household_id: 'HH_39649' },
  { student_id: '39650', household_id: 'HH_39650' },
  { student_id: '39652', household_id: 'HH_39652' },
  { student_id: '39653', household_id: 'HH_39653' },
  { student_id: '39654', household_id: 'HH_39654' },
  { student_id: '39655', household_id: 'HH_39655' },
  { student_id: '39656', household_id: 'HH_39656' },
  { student_id: '39657', household_id: 'HH_39657' },
  { student_id: '39658', household_id: 'HH_39658' },
  { student_id: '39659', household_id: 'HH_39659' },
  { student_id: '39660', household_id: 'HH_39660' },
  { student_id: '39661', household_id: 'HH_39661' },
  { student_id: '39662', household_id: 'HH_39662' },
  { student_id: '39663', household_id: 'HH_39663' },
  { student_id: '39664', household_id: 'HH_39664' },
  { student_id: '39665', household_id: 'HH_39665' },
  { student_id: '39666', household_id: 'HH_39666' },
  { student_id: '39667', household_id: 'HH_39667' },
  { student_id: '39668', household_id: 'HH_39668' },
  { student_id: '39669', household_id: 'HH_39669' },
  { student_id: '39670', household_id: 'HH_39670' },
  { student_id: '39671', household_id: 'HH_39671' },
  { student_id: '39672', household_id: 'HH_39672' },
  { student_id: '39673', household_id: 'HH_39673' },
  { student_id: '39674', household_id: 'HH_39674' },
  { student_id: '39675', household_id: 'HH_39675' },
  { student_id: '39676', household_id: 'HH_39676' },
  { student_id: '39677', household_id: 'HH_39677' },
  { student_id: '39678', household_id: 'HH_39678' },
  { student_id: '39679', household_id: 'HH_39679' },
  { student_id: '39680', household_id: 'HH_39680' },
  { student_id: '39681', household_id: 'HH_39681' },
  { student_id: '39682', household_id: 'HH_39682' },
  { student_id: '39683', household_id: 'HH_39683' },
  { student_id: '39684', household_id: 'HH_39684' },
  { student_id: '39685', household_id: 'HH_39685' },
  { student_id: '39686', household_id: 'HH_39686' },
  { student_id: '39687', household_id: 'HH_39687' },
  { student_id: '39688', household_id: 'HH_39688' },
  { student_id: '39689', household_id: 'HH_39689' },
  { student_id: '39690', household_id: 'HH_39690' },
  { student_id: '39691', household_id: 'HH_39691' },
  { student_id: '39692', household_id: 'HH_39692' },
  { student_id: '39693', household_id: 'HH_39693' },
  { student_id: '39694', household_id: 'HH_39694' },
  { student_id: '39695', household_id: 'HH_39695' },
  { student_id: '39696', household_id: 'HH_39696' },
  { student_id: '39698', household_id: 'HH_39698' },
  { student_id: '39699', household_id: 'HH_39699' },
  { student_id: '39700', household_id: 'HH_39700' },
  { student_id: '39701', household_id: 'HH_39701' },
  { student_id: '39702', household_id: 'HH_39702' },
  { student_id: '39703', household_id: 'HH_39703' },
  { student_id: '39704', household_id: 'HH_39704' },
  { student_id: '39705', household_id: 'HH_39705' },
  { student_id: '39706', household_id: 'HH_39706' },
  { student_id: '39707', household_id: 'HH_39707' },
  { student_id: '39708', household_id: 'HH_39708' },
  { student_id: '39709', household_id: 'HH_39709' },
  { student_id: '39710', household_id: 'HH_39710' },
  { student_id: '39711', household_id: 'HH_39711' },
  { student_id: '39712', household_id: 'HH_39712' },
  { student_id: '39713', household_id: 'HH_39713' },
  { student_id: '39714', household_id: 'HH_39714' },
  { student_id: '39715', household_id: 'HH_39715' },
  { student_id: '39716', household_id: 'HH_39716' },
  { student_id: '39717', household_id: 'HH_39717' },
  { student_id: '39718', household_id: 'HH_39718' },
  { student_id: '39719', household_id: 'HH_39719' },
  { student_id: '39721', household_id: 'HH_39721' },
  { student_id: '39722', household_id: 'HH_39722' },
  { student_id: '39723', household_id: 'HH_39723' },
  { student_id: '39724', household_id: 'HH_39724' },
  { student_id: '39725', household_id: 'HH_39725' },
  { student_id: '39726', household_id: 'HH_39726' },
  { student_id: '39727', household_id: 'HH_39727' },
  { student_id: '39728', household_id: 'HH_39728' },
  { student_id: '39729', household_id: 'HH_39729' },
  { student_id: '39730', household_id: 'HH_39730' },
  { student_id: '39731', household_id: 'HH_39731' },
  { student_id: '39732', household_id: 'HH_39732' },
  { student_id: '39733', household_id: 'HH_39733' },
  { student_id: '39734', household_id: 'HH_39734' },
  { student_id: '39735', household_id: 'HH_39735' },
  { student_id: '39736', household_id: 'HH_39736' },
  { student_id: '39737', household_id: 'HH_39737' },
  { student_id: '39738', household_id: 'HH_39738' },
  { student_id: '39739', household_id: 'HH_39739' },
  { student_id: '39740', household_id: 'HH_39740' },
  { student_id: '39741', household_id: 'HH_39741' },
  { student_id: '39742', household_id: 'HH_39742' },
  { student_id: '39743', household_id: 'HH_39743' },
  { student_id: '39744', household_id: 'HH_39744' },
  { student_id: '39745', household_id: 'HH_39745' },
  { student_id: '39746', household_id: 'HH_39746' },
  { student_id: '39747', household_id: 'HH_39747' },
  { student_id: '39748', household_id: 'HH_39748' },
  { student_id: '39749', household_id: 'HH_39749' },
  { student_id: '39750', household_id: 'HH_39750' },
  { student_id: '39751', household_id: 'HH_39751' },
  { student_id: '39752', household_id: 'HH_39752' },
  { student_id: '39753', household_id: 'HH_39753' },
  { student_id: '39754', household_id: 'HH_39754' },
  { student_id: '39755', household_id: 'HH_39755' },
  { student_id: '39756', household_id: 'HH_39756' },
  { student_id: '39757', household_id: 'HH_39757' },
  { student_id: '39758', household_id: 'HH_39758' },
  { student_id: '39759', household_id: 'HH_39759' },
  { student_id: '39760', household_id: 'HH_39760' },
  { student_id: '39761', household_id: 'HH_39761' },
  { student_id: '39762', household_id: 'HH_39762' },
  { student_id: '39763', household_id: 'HH_39763' },
  { student_id: '39764', household_id: 'HH_39764' },
  { student_id: '39765', household_id: 'HH_39765' },
  { student_id: '39766', household_id: 'HH_39766' },
  { student_id: '39767', household_id: 'HH_39767' },
  { student_id: '39768', household_id: 'HH_39768' },
  { student_id: '39770', household_id: 'HH_39770' },
  { student_id: '39771', household_id: 'HH_39771' },
  { student_id: '39772', household_id: 'HH_39772' },
  { student_id: '39773', household_id: 'HH_39773' },
  { student_id: '39774', household_id: 'HH_39774' },
  { student_id: '39775', household_id: 'HH_39775' },
  { student_id: '39776', household_id: 'HH_39776' },
  { student_id: '39777', household_id: 'HH_39777' },
  { student_id: '39778', household_id: 'HH_39778' },
  { student_id: '39779', household_id: 'HH_39779' },
  { student_id: '39780', household_id: 'HH_39780' },
  { student_id: '39781', household_id: 'HH_39781' },
  { student_id: '39782', household_id: 'HH_39782' },
  { student_id: '39783', household_id: 'HH_39783' },
  { student_id: '39784', household_id: 'HH_39784' },
  { student_id: '39785', household_id: 'HH_39785' },
  { student_id: '39786', household_id: 'HH_39786' },
  { student_id: '39787', household_id: 'HH_39787' },
  { student_id: '39788', household_id: 'HH_39788' },
  { student_id: '39789', household_id: 'HH_39789' },
  { student_id: '39790', household_id: 'HH_39790' },
  { student_id: '39791', household_id: 'HH_39791' },
  { student_id: '39792', household_id: 'HH_39792' },
  { student_id: '39793', household_id: 'HH_39793' },
  { student_id: '39794', household_id: 'HH_39794' },
  { student_id: '39795', household_id: 'HH_39795' },
  { student_id: '39796', household_id: 'HH_39796' },
  { student_id: '39797', household_id: 'HH_39797' },
  { student_id: '39798', household_id: 'HH_39798' },
  { student_id: '39799', household_id: 'HH_39799' },
  { student_id: '39800', household_id: 'HH_39800' },
  { student_id: '39801', household_id: 'HH_39801' },
  { student_id: '39802', household_id: 'HH_39802' },
  { student_id: '39803', household_id: 'HH_39803' },
  { student_id: '39804', household_id: 'HH_39804' },
  { student_id: '39805', household_id: 'HH_39805' },
  { student_id: '39806', household_id: 'HH_39806' },
  { student_id: '39807', household_id: 'HH_39807' },
  { student_id: '39808', household_id: 'HH_39808' },
  { student_id: '39809', household_id: 'HH_39809' },
  { student_id: '39810', household_id: 'HH_39810' },
  { student_id: '39811', household_id: 'HH_39811' },
  { student_id: '39812', household_id: 'HH_39812' },
  { student_id: '39813', household_id: 'HH_39813' },
  { student_id: '39814', household_id: 'HH_39814' },
  { student_id: '39815', household_id: 'HH_39815' },
  { student_id: '39816', household_id: 'HH_39816' },
  { student_id: '39817', household_id: 'HH_39817' },
  { student_id: '39818', household_id: 'HH_39818' },
  { student_id: '39819', household_id: 'HH_39819' },
  { student_id: '39820', household_id: 'HH_39820' },
  { student_id: '39821', household_id: 'HH_39821' },
  { student_id: '39822', household_id: 'HH_39822' },
  { student_id: '39823', household_id: 'HH_39823' },
  { student_id: '39824', household_id: 'HH_39824' },
  { student_id: '39825', household_id: 'HH_39825' },
  { student_id: '39826', household_id: 'HH_39826' },
  { student_id: '39827', household_id: 'HH_39827' },
  { student_id: '39828', household_id: 'HH_39828' },
  { student_id: '39829', household_id: 'HH_39829' },
  { student_id: '39830', household_id: 'HH_39830' },
  { student_id: '39831', household_id: 'HH_39831' },
  { student_id: '39832', household_id: 'HH_39832' },
  { student_id: '39833', household_id: 'HH_39833' },
  { student_id: '39834', household_id: 'HH_39834' },
  { student_id: '39835', household_id: 'HH_39835' },
  { student_id: '39836', household_id: 'HH_39836' },
  { student_id: '39837', household_id: 'HH_39837' },
  { student_id: '39838', household_id: 'HH_39838' },
  { student_id: '39839', household_id: 'HH_39839' },
  { student_id: '39840', household_id: 'HH_39840' },
  { student_id: '39841', household_id: 'HH_39841' },
  { student_id: '39842', household_id: 'HH_39842' },
  { student_id: '39843', household_id: 'HH_39843' },
  { student_id: '39844', household_id: 'HH_39844' },
  { student_id: '39845', household_id: 'HH_39845' },
  { student_id: '39846', household_id: 'HH_39846' },
  { student_id: '39847', household_id: 'HH_39847' },
  { student_id: '39848', household_id: 'HH_39848' },
  { student_id: '39849', household_id: 'HH_39849' },
  { student_id: '39850', household_id: 'HH_39850' },
  { student_id: '39851', household_id: 'HH_39851' },
  { student_id: '39852', household_id: 'HH_39852' },
  { student_id: '39853', household_id: 'HH_39853' },
  { student_id: '39854', household_id: 'HH_39854' },
  { student_id: '39855', household_id: 'HH_39855' },
  { student_id: '39856', household_id: 'HH_39856' },
  { student_id: '39857', household_id: 'HH_39857' },
  { student_id: '39858', household_id: 'HH_39858' },
  { student_id: '39859', household_id: 'HH_39859' },
  { student_id: '39860', household_id: 'HH_39860' },
  { student_id: '39861', household_id: 'HH_39861' },
  { student_id: '39862', household_id: 'HH_39862' },
  { student_id: '39863', household_id: 'HH_39863' },
  { student_id: '39864', household_id: 'HH_39864' },
  { student_id: '39865', household_id: 'HH_39865' },
  { student_id: '39866', household_id: 'HH_39866' },
  { student_id: '39867', household_id: 'HH_39867' },
  { student_id: '39868', household_id: 'HH_39868' },
  { student_id: '39869', household_id: 'HH_39869' },
  { student_id: '39870', household_id: 'HH_39870' },
  { student_id: '39871', household_id: 'HH_39871' },
  { student_id: '39872', household_id: 'HH_39872' },
  { student_id: '39873', household_id: 'HH_39873' },
  { student_id: '39874', household_id: 'HH_39874' },
  { student_id: '39875', household_id: 'HH_39875' },
  { student_id: '39876', household_id: 'HH_39876' },
  { student_id: '39877', household_id: 'HH_39877' },
  { student_id: '39878', household_id: 'HH_39878' },
  { student_id: '39879', household_id: 'HH_39879' },
  { student_id: '39880', household_id: 'HH_39880' },
  { student_id: '39881', household_id: 'HH_39881' },
  { student_id: '39882', household_id: 'HH_39882' },
  { student_id: '39883', household_id: 'HH_39883' },
  { student_id: '39884', household_id: 'HH_39884' },
  { student_id: '39885', household_id: 'HH_39885' },
  { student_id: '39886', household_id: 'HH_39886' },
  { student_id: '39887', household_id: 'HH_39887' },
  { student_id: '39888', household_id: 'HH_39888' },
  { student_id: '39889', household_id: 'HH_39889' },
  { student_id: '39890', household_id: 'HH_39890' },
  { student_id: '39891', household_id: 'HH_39891' },
  { student_id: '39892', household_id: 'HH_39892' },
  { student_id: '39893', household_id: 'HH_39893' },
  { student_id: '39894', household_id: 'HH_39894' },
  { student_id: '39895', household_id: 'HH_39895' },
  { student_id: '39896', household_id: 'HH_39896' },
  { student_id: '39897', household_id: 'HH_39897' },
  { student_id: '39898', household_id: 'HH_39898' },
  { student_id: '39899', household_id: 'HH_39899' },
  { student_id: '39900', household_id: 'HH_39900' },
  { student_id: '39901', household_id: 'HH_39901' },
  { student_id: '39902', household_id: 'HH_39902' },
  { student_id: '39903', household_id: 'HH_39903' },
  { student_id: '39904', household_id: 'HH_39904' },
  { student_id: '39905', household_id: 'HH_39905' },
  { student_id: '39906', household_id: 'HH_39906' },
  { student_id: '39907', household_id: 'HH_39907' },
  { student_id: '39908', household_id: 'HH_39908' },
  { student_id: '39909', household_id: 'HH_39909' },
  { student_id: '39910', household_id: 'HH_39910' },
  { student_id: '39911', household_id: 'HH_39911' },
  { student_id: '39912', household_id: 'HH_39912' },
  { student_id: '39913', household_id: 'HH_39913' },
  { student_id: '39914', household_id: 'HH_39914' },
  { student_id: '39915', household_id: 'HH_39915' },
  { student_id: '39916', household_id: 'HH_39916' },
  { student_id: '39917', household_id: 'HH_39917' },
  { student_id: '39918', household_id: 'HH_39918' },
  { student_id: '39919', household_id: 'HH_39919' },
  { student_id: '39920', household_id: 'HH_39920' },
  { student_id: '39921', household_id: 'HH_39921' },
  { student_id: '39922', household_id: 'HH_39922' },
  { student_id: '39923', household_id: 'HH_39923' },
  { student_id: '39924', household_id: 'HH_39924' },
  { student_id: '39925', household_id: 'HH_39925' },
  { student_id: '39926', household_id: 'HH_39926' },
  { student_id: '39927', household_id: 'HH_39927' },
  { student_id: '39928', household_id: 'HH_39928' },
  { student_id: '39929', household_id: 'HH_39929' },
  { student_id: '39930', household_id: 'HH_39930' },
  { student_id: '39931', household_id: 'HH_39931' },
  { student_id: '39932', household_id: 'HH_39932' },
  { student_id: '39933', household_id: 'HH_39933' },
  { student_id: '39934', household_id: 'HH_39934' },
  { student_id: '39935', household_id: 'HH_39935' },
  { student_id: '39936', household_id: 'HH_39936' },
  { student_id: '39937', household_id: 'HH_39937' },
  { student_id: '39938', household_id: 'HH_39938' },
  { student_id: '39939', household_id: 'HH_39939' },
  { student_id: '39940', household_id: 'HH_39940' },
  { student_id: '39941', household_id: 'HH_39941' },
  { student_id: '39942', household_id: 'HH_39942' },
  { student_id: '39943', household_id: 'HH_39943' },
  { student_id: '39944', household_id: 'HH_39944' },
  { student_id: '39945', household_id: 'HH_39945' },
  { student_id: '39946', household_id: 'HH_39946' },
  { student_id: '39947', household_id: 'HH_39947' },
  { student_id: '39948', household_id: 'HH_39948' },
  { student_id: '39949', household_id: 'HH_39949' },
  { student_id: '39950', household_id: 'HH_39950' },
  { student_id: '39951', household_id: 'HH_39951' },
  { student_id: '39952', household_id: 'HH_39952' },
  { student_id: '39953', household_id: 'HH_39953' },
  { student_id: '39954', household_id: 'HH_39954' },
  { student_id: '39955', household_id: 'HH_39955' },
  { student_id: '39956', household_id: 'HH_39956' },
  { student_id: '39957', household_id: 'HH_39957' },
  { student_id: '39958', household_id: 'HH_39958' },
  { student_id: '39959', household_id: 'HH_39959' },
  { student_id: '39960', household_id: 'HH_39960' },
  { student_id: '39961', household_id: 'HH_39961' },
  { student_id: '39962', household_id: 'HH_39962' },
  { student_id: '39963', household_id: 'HH_39963' },
  { student_id: '39964', household_id: 'HH_39964' },
  { student_id: '39965', household_id: 'HH_39965' },
  { student_id: '39966', household_id: 'HH_39966' },
  { student_id: '39967', household_id: 'HH_39967' },
  { student_id: '39968', household_id: 'HH_39968' },
  { student_id: '39969', household_id: 'HH_39969' },
  { student_id: '39970', household_id: 'HH_39970' },
  { student_id: '39971', household_id: 'HH_39971' },
  { student_id: '39972', household_id: 'HH_39972' },
  { student_id: '39973', household_id: 'HH_39973' },
  { student_id: '39974', household_id: 'HH_39974' },
  { student_id: '39975', household_id: 'HH_39975' },
  { student_id: '39976', household_id: 'HH_39976' },
  { student_id: '39977', household_id: 'HH_39977' },
  { student_id: '39978', household_id: 'HH_39978' },
  { student_id: '39979', household_id: 'HH_39979' },
  { student_id: '39980', household_id: 'HH_39980' },
  { student_id: '39981', household_id: 'HH_39981' },
  { student_id: '39982', household_id: 'HH_39982' },
  { student_id: '39983', household_id: 'HH_39983' },
  { student_id: '39984', household_id: 'HH_39984' },
  { student_id: '39985', household_id: 'HH_39985' },
  { student_id: '39986', household_id: 'HH_39986' },
  { student_id: '39987', household_id: 'HH_39987' },
  { student_id: '39988', household_id: 'HH_39988' },
  { student_id: '39989', household_id: 'HH_39989' },
  { student_id: '39990', household_id: 'HH_39990' },
  { student_id: '39991', household_id: 'HH_39991' },
  { student_id: '39992', household_id: 'HH_39992' },
  { student_id: '39993', household_id: 'HH_39993' },
  { student_id: '39994', household_id: 'HH_39994' },
  { student_id: '39995', household_id: 'HH_39995' },
  { student_id: '39996', household_id: 'HH_39996' },
  { student_id: '39997', household_id: 'HH_39997' },
  { student_id: '39998', household_id: 'HH_39998' },
  { student_id: '39999', household_id: 'HH_39999' },
  { student_id: '40000', household_id: 'HH_40000' }
];

// Volunteer codes from JSON file
const volunteerCodes = [
  { name: "Bianca Balderas", email: "biancaybalderas@gmail.com", code: "518705" },
  { name: "Dana Maslak", email: "Samantha.jackson12@hotmail.com", notes: "(Sam signed up Dana)", code: "908693" },
  { name: "Debbie Schairer", email: "Debbieschairer@gmail.com", code: "877604" },
  { name: "Guzel Garipova", email: "guzeka84@gmail.com", code: "387001" },
  { name: "Henny Abraham", email: "abraham4cm@gmail.com", code: "705154" },
  { name: "Jen Reynolds", email: "reynolds4916@gmail.com", code: "236017" },
  { name: "Kathleen Timoney", email: "katietimoney@yahoo.com", code: "606979" },
  { name: "Kayce Garcia", email: "kaycegarcia@gmail.com", code: "627543" },
  { name: "Kayla Drake", email: "Kayladrake1@gmail.com", code: "968183" },
  { name: "Kristin Aguilera", email: "kristin.n.ruiz@gmail.com", code: "845934" },
  { name: "Lauren Deary", email: "laurendeary24@gmail.com", code: "378213" },
  { name: "Lauren McGhee", email: "lmcghee513@gmail.com", code: "131022" },
  { name: "Lyndsie Faber", email: "lyndsiefaber@gmail.com", code: "210680" },
  { name: "Natalie Silvia", email: "HelloNato@gmail.com", code: "957718" },
  { name: "Samantha Maslak", email: "Samantha.jackson12@hotmail.com", code: "564301" },
  { name: "Shannon McEuen", email: "shannonmceuen@gmail.com", code: "237721" },
  { name: "Shelly Dekelaita", email: "Shelly.dekelaita@gmail.com", code: "610368" },
  { name: "Tassa Drake", email: "tassadrake@yahoo.com", code: "637514" },
  { name: "Tiffany Tooley", email: "tmw1782@gmail.com", code: "223052" },
  { name: "Misty Atherton", email: "Mistyatherton97@gmail.com", code: "407739" },
  { name: "Katie Lazarus", email: "Katieetch@gmail.com", code: "873077" },
  { name: "Ms. Gomez", email: "mgomez@eurekausd.org", code: "462401" },
  { name: "Mrs. Schofield", email: "lschofield@eurekausd.org", code: "368528" },
  { name: "Ms. Schauer", email: "kschauer@eurekausd.org", code: "900037" },
  { name: "Mrs. Moshosky", email: "ammoshofsky@eurekausd.org", code: "772424" },
  { name: "Mrs. Petersen", email: "cpetersen@eurekausd.org", code: "943749" },
  { name: "Mrs. Hoslett", email: "ahoslett@eurekausd.org", code: "621092" },
  { name: "Mrs. Hagman", email: "khagman@eurekausd.org", code: "382842" },
  { name: "Mrs. Lopez", email: "amann@eurekausd.org", code: "122474" },
  { name: "Mrs. Reineman", email: "kreineman@eurekausd.org", code: "130484" },
  { name: "Mrs. Andrew", email: "clandrew@eurekausd.org", code: "413682" },
  { name: "Chrissy Khuu", email: "chrissykhuu@gmail.com", code: "807327" },
  { name: "Whitney Davy", email: "whitneyprussell@gmail.com", code: "258949" },
  { name: "Elizabeth Hintz", email: "elizabethmhintz@gmail.com", code: "630237" },
  { name: "Aubrey Wong", email: "wheretruthsarefound@gmail.com", code: "255705" },
  { name: "Alicia Ruiz", email: "aliciaruizrn@gmail.com", code: "315789" },
  { name: "Ashley Koontz", email: "akoontz2016@gmail.com", code: "229975" },
  { name: "Noelle Tallariti", email: "noellet20@yahoo.com", code: "739957" },
  { name: "Amanda Slinkard", email: "amanda.c.slinkard@gmail.com", code: "354825" },
  { name: "Spencer GiIl", email: "spencer.gil02@gmail.com", code: "136123" },
  { name: "Lindsay Barber", email: "Lindsay.barber@sanjuan.edu", code: "575626" },
  { name: "Nicole Carillo", email: "nicole_duran@me.com", code: "826931" },
  { name: "Jaspreet Bal", email: "jaspreetus@yahoo.com", code: "304037" },
  { name: "Amanvir Gil", email: "Aman_rn2be@yahoo.com", code: "847537" },
  { name: "Monica Noda-Ruiz", email: "noda.monica@gmail.com", code: "670569" },
  { name: "Admin", email: "admin@maidu.com", code: "339933", notes: "System Administrator" }
];

// Initialize secure storage
let analyticsData = {
  userLogins: [],
  showSelections: [],
  purchases: [],
  sessions: {},
  metadata: {
    lastUpdated: new Date().toISOString(),
    version: '2.0',
    storage: 'netlify-secure-file',
    encryption: 'AES-256-CBC'
  }
};

// Initialize storage on startup
async function initializeStorage() {
  try {
    console.log('🔒 Initializing secure file storage...');
    
    // Load existing data
    const data = await secureStorage.getAnalytics();
    if (data) {
      analyticsData = data;
      console.log(`📊 Loaded ${analyticsData.userLogins.length} logins, ${analyticsData.showSelections.length} selections, ${analyticsData.purchases.length} purchases`);
    } else {
      console.log('📊 Starting with fresh analytics data');
    }
  } catch (error) {
    console.error('❌ Storage initialization failed:', error);
  }
}

// Initialize on startup
initializeStorage();

// In-memory storage for sessions (temporary)
const sessions = new Map();

// Helper functions
function findStudent(studentId) {
  return students.find(s => s.student_id === studentId);
}

function findVolunteer(code, email) {
  return volunteerCodes.find(v => 
    v.code === code && v.email.toLowerCase() === email.toLowerCase()
  );
}

function createSession(householdId) {
  const sessionId = bcrypt.hashSync(householdId + Date.now(), 10);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  sessions.set(sessionId, {
    householdId,
    expiresAt,
    createdAt: new Date().toISOString()
  });
  
  return sessionId;
}

function verifySession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  if (new Date() > new Date(session.expiresAt)) {
    sessions.delete(sessionId);
    return null;
  }
  
  return session;
}

// Main handler
exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, headers, body } = event;
    
    // Extract the route from the Netlify path
    // Path will be like: /api/login (from redirect) or /.netlify/functions/api/login (direct)
    // We need to extract: /login
    let route = path;
    if (path.startsWith('/.netlify/functions/api')) {
      route = path.replace('/.netlify/functions/api', '');
    } else if (path.startsWith('/api/')) {
      route = path.replace('/api', '');
    }
    route = route || '/';
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json'
    };
    
    // Handle preflight requests
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }
    
    // Health check
    if (route === '/health' || route === '/') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          status: 'OK', 
          timestamp: new Date().toISOString(),
          students: students.length,
          volunteers: volunteerCodes.length
        })
      };
    }
    
    // Student login
    if (route === '/login' && httpMethod === 'POST') {
      const { studentId } = JSON.parse(body);
      
      if (!studentId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: false, 
            message: 'Student ID is required' 
          })
        };
      }
      
      const student = findStudent(studentId);
      if (!student) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: false, 
            message: 'Student ID not found. Please check your Student ID and try again.' 
          })
        };
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          householdId: student.household_id,
          studentId: student.student_id 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Create session
      const sessionId = createSession(student.household_id);
      
      // Track login in secure storage
      const loginData = {
        user_id: student.household_id,
        user_type: 'student',
        identifier: studentId,
        email: '',
        name: '',
        ip_address: headers['x-forwarded-for'] || headers['x-real-ip'] || '',
        user_agent: headers['user-agent'] || '',
        login_timestamp: new Date().toISOString(),
        session_id: sessionId,
        domain: headers.host || 'unknown'
      };
      
      // Store in secure file storage
      await secureStorage.storeLogin(loginData);
      
      // Update local cache
      const sanitizedData = secureStorage.sanitizeLoginData(loginData);
      analyticsData.userLogins.push(sanitizedData);
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          token,
          householdId: student.household_id,
          isVolunteer: false
        })
      };
    }
    
    // Volunteer login
    if (route === '/volunteer-login' && httpMethod === 'POST') {
      const { volunteerCode, email } = JSON.parse(body);
      
      if (!volunteerCode || !email) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: false, 
            message: 'Volunteer code and email are required' 
          })
        };
      }
      
      const volunteer = findVolunteer(volunteerCode, email);
      if (!volunteer) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: false, 
            message: 'Invalid volunteer code or email. Please check your credentials and try again.' 
          })
        };
      }
      
      // Check if admin
      const isAdmin = volunteerCode === '339933' && volunteer.email.toLowerCase() === 'admin@maidu.com';
      const volunteerHouseholdId = isAdmin ? 'ADMIN' : `VOL_${volunteerCode}`;
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          householdId: volunteerHouseholdId,
          volunteerCode: volunteerCode,
          isVolunteer: true,
          isAdmin: isAdmin
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Create session
      const sessionId = createSession(volunteerHouseholdId);
      
      // Track login in secure storage
      const loginData = {
        user_id: volunteerHouseholdId,
        user_type: 'volunteer',
        identifier: volunteerCode,
        email: volunteer.email,
        name: volunteer.name,
        ip_address: headers['x-forwarded-for'] || headers['x-real-ip'] || '',
        user_agent: headers['user-agent'] || '',
        login_timestamp: new Date().toISOString(),
        session_id: sessionId,
        domain: headers.host || 'unknown'
      };
      
      // Store in secure file storage
      await secureStorage.storeLogin(loginData);
      
      // Update local cache
      const sanitizedData = secureStorage.sanitizeLoginData(loginData);
      analyticsData.userLogins.push(sanitizedData);
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          token,
          householdId: volunteerHouseholdId,
          isVolunteer: true,
          isAdmin: isAdmin
        })
      };
    }
    
    // Track event interaction
    if (route === '/track-event' && httpMethod === 'POST') {
      const { eventKey, eventType, userId, userType, metadata } = JSON.parse(body);
      
      const eventData = {
        event_key: eventKey,
        event_type: eventType, // 'sprouter_embed_loaded', 'sprouter_checkout_started', 'sprouter_checkout_completed', 'sprouter_checkout_abandoned'
        user_id: userId,
        user_type: userType,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
        ip_address: headers['x-forwarded-for'] || headers['x-real-ip'] || '',
        user_agent: headers['user-agent'] || ''
      };
      
      // Store in secure file storage
      await secureStorage.storeEvent(eventData);
      
      // Update local cache
      if (eventType === 'sprouter_embed_loaded') {
        analyticsData.showSelections.push(eventData);
      } else if (eventType === 'sprouter_checkout_completed') {
        analyticsData.purchases.push({
          ...eventData,
          total_cost: metadata?.total_cost || 0,
          tickets_purchased: metadata?.tickets_purchased || 0,
          payment_method: metadata?.payment_method || 'unknown'
        });
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, tracked: eventData })
      };
    }
    
    // Track page view and session activity
    if (route === '/track-session' && httpMethod === 'POST') {
      console.log('📊 Session tracking request received:', body);
      const sessionDataArray = JSON.parse(body);
      
      // Handle both single session and array of sessions
      const sessions = Array.isArray(sessionDataArray) ? sessionDataArray : [sessionDataArray];
      
      for (const sessionData of sessions) {
        const { userId, userType, page, sessionId, timeOnPage, referrer } = sessionData;
        
        const enhancedSessionData = {
          user_id: userId,
          user_type: userType,
          session_id: sessionId,
          page: page,
          time_on_page: timeOnPage,
          referrer: referrer,
          timestamp: new Date().toISOString(),
          ip_address: headers['x-forwarded-for'] || headers['x-real-ip'] || '',
          user_agent: headers['user-agent'] || '',
          domain: headers.host || 'unknown'
        };
        
        // Store session data
        await secureStorage.storeSession(enhancedSessionData);
        console.log('✅ Session stored:', enhancedSessionData.user_id, enhancedSessionData.page);
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, sessionsTracked: sessions.length })
      };
    }
    
    // Track user activity (clicks, scrolls, etc.)
    if (route === '/track-activity' && httpMethod === 'POST') {
      console.log('📊 Activity tracking request received:', body);
      const activityDataArray = JSON.parse(body);
      
      // Handle both single activity and array of activities
      const activities = Array.isArray(activityDataArray) ? activityDataArray : [activityDataArray];
      
      for (const activityData of activities) {
        const { userId, userType, activityType, page, metadata } = activityData;
        
        const enhancedActivityData = {
          user_id: userId,
          user_type: userType,
          activity_type: activityType, // 'page_view', 'click', 'scroll', 'form_interaction', 'time_on_page'
          page: page,
          metadata: metadata || {},
          timestamp: new Date().toISOString(),
          ip_address: headers['x-forwarded-for'] || headers['x-real-ip'] || '',
          user_agent: headers['user-agent'] || ''
        };
        
        // Store activity data
        await secureStorage.storeActivity(enhancedActivityData);
        console.log('✅ Activity stored:', enhancedActivityData.user_id, enhancedActivityData.activity_type);
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, activitiesTracked: activities.length })
      };
    }
    
    // Analytics endpoint removed - handled by dedicated analytics.js function
    
    // Data export endpoint (admin only)
    if (route === '/export-data' && httpMethod === 'GET') {
      // Check for admin authorization
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Unauthorized - Admin token required' })
        };
      }
      
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (!decoded.isAdmin) {
          return {
            statusCode: 403,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Forbidden - Admin access required' })
          };
        }
        
        // Return sanitized analytics data from secure storage
        const exportData = await secureStorage.exportData();
        
        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Disposition': 'attachment; filename="analytics-export.json"'
          },
          body: JSON.stringify(exportData, null, 2)
        };
      } catch (error) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid token' })
        };
      }
    }
    
    // Default response
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Route not found',
        requestedRoute: route,
        availableRoutes: ['/health', '/login', '/volunteer-login', '/analytics', '/export-data']
      })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};
