export const CONNECTOR_CLASS = 'cce0463c-2dd3-4ee2-aef0-4b83c9c29970';
export const CONNECTOR_PIVOT = '5af041e3-6657-4064-a89a-390135440967';
export const GUIDE_CLASS = '48d6c82e-f78b-42f2-8c19-ba9aaf457740';
export const GUIDE_FIELDS = '72b2b48e-d2c9-43b4-b2a0-ab85da32421f';
export const KEYS_CLASS = '49b4fab1-e33d-444d-8c30-72ef443ba92c';
export const FIELDS_LIST = '3f9967fe-b86c-4e89-8fc1-e736024f8665';
export const INFOSERVICE_CLASS = 'b44b4843-f919-4362-b95c-4c354b2505bd';
export const IS_FIELDS = '1fa330a3-4b65-42e4-b12f-1fabd0c08945';
export const BINDS = '11c1cd14-238a-4114-a265-3ed7e07fbbda';
export const CUBES_CLASS = '4d0cb622-60fc-40db-97d6-be103b26051e';
export const CUBE_LAYERS = '75960867-7c8d-486a-ad15-94d387cda86e';
export const CUBE_DIMS = '00234649-8eaa-4a3d-9adb-280b01fa8437';
export const CUBE_MEAS = 'b8e2b31f-f36d-4b77-b13d-f391bd96c60a';
export const CUBE_ISLIST = '4bc0bfd0-6fb5-4f85-8668-117a42604ddc';
export const REPORTS_CLASS = '04e89fcd-82f0-4d17-afab-d6ab35a10c83';
export const REP_LAYERS = '8c71a969-e5cf-4e6e-9eb9-8e17d8b96cac';
export const REP_DIMS = '3295a7ae-2c8c-474f-9e97-00b548454830';
export const REP_MEAS = '78ae908d-0737-42aa-9365-fc51c99b62a6';
export const REP_ISLIST = '04ef8cae-65fe-4ad2-9e5f-121419c652ad';

export const CUBE_ID = '471ef5dd-00aa-43b9-8245-b32594fbbfbc';
export const FACT_IS = '9ddc2f13-cfe2-473b-8905-ccf53a41b854';
export const PLAN_IS = '0ef1b304-5f4d-42d7-ba77-ebadb36de272';
export const GUIDE_AUTO = 'b0306c68-32f6-450b-8a08-79981fab5b4f';
export const GUIDE_REGION = '07856e6f-dff2-491a-be32-9a225604d19a';
export const GUIDE_CALC = 'f698d610-d06c-415c-b6c5-5c319890c3f9';
export const LAYER_FACT = '87a3e063-ee71-4c88-aacd-56e15d5eec6b';
export const LAYER_PLAN = 'f627ece8-f636-4e0e-a8d4-446a0a9ef410';
export const REPORT_ID = '705baa85-249d-4a1a-9e6a-1ad7b3a2647b';

const L = (cls, value) => ({ link: cls, value });

function m(id, parent, classId, className, name, description, settings) {
  return { id, parent, class_id: classId, class: className, name, description, settings };
}

export function buildEtalonMetadata(connectorId) {
  const conn = L(CONNECTOR_CLASS, connectorId);
  const auto = L(GUIDE_CLASS, GUIDE_AUTO);
  const region = L(GUIDE_CLASS, GUIDE_REGION);
  const calc = L(GUIDE_CLASS, GUIDE_CALC);

  const autoId = '9ecd19b1-d428-4e40-b354-a7b97b5d5a04';
  const autoParent = '137f2696-49a0-49d5-a771-4257758e9dfb';
  const autoName = 'efb59e4e-1e8a-4485-8f05-e540530c4a67';
  const autoSort = 'b8e50259-3b0a-4f8d-b2e7-c219abca9899';
  const autoLevel = '802fb8a1-5072-4a86-b0ad-1521e979190a';
  const autoPk = '22ad021a-ef95-4605-a3c1-45d50ef136ff';
  const autoPkList = '8a76081d-15ae-4564-8c9f-cdf45cefc3c2';

  const calcId = 'd64e3e3d-df5c-42d3-9f2d-61c5a843cbaa';
  const calcName = '74d775d2-307a-4091-bafb-6751b17f6b23';
  const calcDesc = '3fd3ffc7-2f4f-47a0-91a3-2b221edf7e7a';
  const calcPk = 'bacc52eb-966d-4ba1-9870-a9f1ea335929';
  const calcPkList = '5da617c9-fd1c-44f7-abd1-326398b432e1';

  const regionId = '80984516-4a1f-49be-be06-9e82ba54b046';
  const regionParent = 'e804e320-94d1-4359-bab1-58841aa6d8a8';
  const regionName = '568810f2-94ae-48ac-9b3e-535b37bfaa70';
  const regionSort = 'bdbb93e5-1d53-4355-b032-d8c5b4518068';
  const regionLevel = '75605b3a-4a33-423d-b66c-5653ac922894';
  const regionPk = '888dd79a-79bd-4a82-aa76-865503c151da';
  const regionPkList = 'deffd983-21e4-4377-b926-efe20f948064';

  const fAuto = 'a0585030-d524-401c-bef3-3641d5742573';
  const fDate = '446ccf46-1921-4184-ac21-851ff6bd1124';
  const fRegion = '341b6702-3ce7-49a0-9ca9-188e20ec4002';
  const fCalc = '490bf573-fc3b-4904-a1f0-e7c28301334f';
  const fQty = '82aeaa8b-4164-44d6-aeea-39e4f2d1ebb8';
  const fRev = '3d79d1fe-1321-41d6-9420-0a915bdb22d9';
  const fPrice = '41597cd9-00ad-40ae-8a24-6146c5902bdd';

  const pAuto = '9795ee47-d0bb-4c7e-be51-28c49343ba37';
  const pDate = '89c64b90-fa5d-4cc6-9418-b0e835260de8';
  const pRegion = '33e3a2e0-c401-43b8-bce6-850d4e1c0b78';
  const pCalc = 'e0394a91-4cc6-401c-a3fe-5d677f214d3c';
  const pQty = '66e41a26-1fef-42d3-a1a6-ef5725718ffc';
  const pRev = '4d91e6b3-3659-4deb-ba62-4ed860fe5311';
  const pPrice = 'bc362c99-8692-46fb-96c1-c17d134c5c4d';

  const dAuto = '1bd2849d-52a9-4e17-a011-053b341db028';
  const dDate = '9de3f709-bb2d-427a-9322-c9f8d529d880';
  const dRegion = '0f1619f7-17d4-4c02-ad67-1873ea024d83';
  const dCalc = 'cf9b4a70-1172-4f2c-b6b9-f1c41104433c';
  const mQty = '62ee4a4c-ad11-4665-9440-b41ccaaf8072';
  const mRev = '151674a0-3fa0-48fd-af46-6ab36ec2eb38';
  const mPrice = 'e33b157d-689e-4ab1-b1ca-07302819cec5';

  const rLayerFact = '31c967ff-cbb1-4ed4-979a-07e7579443e8';
  const rLayerPlan = '61aad063-267a-490b-9958-9197b385970a';
  const rdAuto = '3cff0033-3dbc-46b7-839a-96a463396b4f';
  const rdDate = 'c52f2925-ac44-4c8e-9317-a1c16c63e10b';
  const rdRegion = '0f8ee6a3-955d-41e0-8099-ba78b0d09956';
  const rdCalc = '7f0e79b8-9d99-4bfd-b0c9-e7c28aedb8f6';
  const rmQty = 'bd611555-a1b7-45a0-87af-2aef5f4cb4fd';
  const rmRev = '26790193-ed86-4b7a-ba40-05b6a7249d30';
  const rmPrice = 'd1f8e242-cfd5-4548-b93f-6bc6bec1d2ec';

  return [
    m(GUIDE_AUTO, GUIDE_CLASS, GUIDE_CLASS, GUIDE_CLASS, 'dim_auto_car_hierarchy', 'Автомобиль', {
      id: GUIDE_AUTO,
      table: 'dim_auto_car_hierarchy',
      connector: conn,
      hierarchy: true,
      onoff: false,
      fieldhierarchy: L(GUIDE_FIELDS, autoParent),
      fieldhierarchydefault: null,
      hideNestedIfEqual: false,
    }),
    m(autoId, GUIDE_AUTO, GUIDE_FIELDS, 'Fields', 'id', 'Суррогатный ключ', {
      id: autoId, nameField: 'id', type: 'integer', virtual: false, onoff: false,
    }),
    m(autoParent, GUIDE_AUTO, GUIDE_FIELDS, 'Fields', 'parent_id', 'Родитель', {
      id: autoParent, nameField: 'parent_id', type: 'integer', virtual: false, onoff: true,
    }),
    m(autoName, GUIDE_AUTO, GUIDE_FIELDS, 'Fields', 'name', 'Наименование', {
      id: autoName, nameField: 'name', type: 'text', virtual: false, onoff: false,
    }),
    m(autoSort, GUIDE_AUTO, GUIDE_FIELDS, 'Fields', 'sort_order', 'Порядок сортировки', {
      id: autoSort, nameField: 'sort_order', type: 'integer', virtual: false, onoff: false,
    }),
    m(autoLevel, GUIDE_AUTO, GUIDE_FIELDS, 'Fields', 'level', 'Уровень иерархии', {
      id: autoLevel, nameField: 'level', type: 'integer', virtual: false, onoff: true,
    }),
    m(autoPk, GUIDE_AUTO, KEYS_CLASS, 'Keys', 'pk', 'Pk', {
      primarykey: true, fieldview: L(GUIDE_FIELDS, autoName),
    }),
    m(autoPkList, autoPk, FIELDS_LIST, 'FieldsList', 'id', 'Id', {
      ref: L(GUIDE_FIELDS, autoId),
    }),

    m(GUIDE_CALC, GUIDE_CLASS, GUIDE_CLASS, GUIDE_CLASS, 'dim_calculation_method', 'Способы расчета', {
      id: GUIDE_CALC, table: 'dim_calculation_method', connector: conn, hierarchy: false, onoff: false, hideNestedIfEqual: false,
    }),
    m(calcId, GUIDE_CALC, GUIDE_FIELDS, 'Fields', 'id', 'Суррогатный ключ', {
      id: calcId, nameField: 'id', type: 'integer', virtual: false, onoff: false,
    }),
    m(calcName, GUIDE_CALC, GUIDE_FIELDS, 'Fields', 'name', 'Краткое название способа расчета', {
      id: calcName, nameField: 'name', type: 'text', virtual: false, onoff: false,
    }),
    m(calcDesc, GUIDE_CALC, GUIDE_FIELDS, 'Fields', 'description', 'Описание способа расчета', {
      id: calcDesc, nameField: 'description', type: 'text', virtual: false, onoff: false,
    }),
    m(calcPk, GUIDE_CALC, KEYS_CLASS, 'Keys', 'pk', 'Pk', {
      id: calcPk, primarykey: true, fieldview: L(GUIDE_FIELDS, calcName),
    }),
    m(calcPkList, calcPk, FIELDS_LIST, 'FieldsList', 'id', 'Id', {
      ref: L(GUIDE_FIELDS, calcId),
    }),

    m(GUIDE_REGION, GUIDE_CLASS, GUIDE_CLASS, GUIDE_CLASS, 'dim_region_sales', 'Иерархический справочник регионов: Страна->Область->Город', {
      id: GUIDE_REGION,
      table: 'dim_region_sales',
      connector: conn,
      hierarchy: true,
      onoff: false,
      fieldhierarchy: L(GUIDE_FIELDS, regionParent),
      fieldhierarchydefault: null,
      hideNestedIfEqual: false,
    }),
    m(regionId, GUIDE_REGION, GUIDE_FIELDS, 'Fields', 'id', 'Суррогатный ключ', {
      id: regionId, nameField: 'id', type: 'integer', virtual: false, onoff: false,
    }),
    m(regionParent, GUIDE_REGION, GUIDE_FIELDS, 'Fields', 'parent_id', 'Родитель', {
      id: regionParent, nameField: 'parent_id', type: 'integer', virtual: false, onoff: true,
    }),
    m(regionName, GUIDE_REGION, GUIDE_FIELDS, 'Fields', 'name', 'Наименование', {
      id: regionName, nameField: 'name', type: 'text', virtual: false, onoff: false,
    }),
    m(regionSort, GUIDE_REGION, GUIDE_FIELDS, 'Fields', 'sort_order', 'Порядок сортировки', {
      id: regionSort, nameField: 'sort_order', type: 'integer', virtual: false, onoff: false,
    }),
    m(regionLevel, GUIDE_REGION, GUIDE_FIELDS, 'Fields', 'level', 'Уровень', {
      id: regionLevel, nameField: 'level', type: 'integer', virtual: false, onoff: true,
    }),
    m(regionPk, GUIDE_REGION, KEYS_CLASS, 'Keys', 'pk', 'Pk', {
      primarykey: true, fieldview: L(GUIDE_FIELDS, regionName),
    }),
    m(regionPkList, regionPk, FIELDS_LIST, 'FieldsList', 'id', 'Id', {
      ref: L(GUIDE_FIELDS, regionId),
    }),

    m(FACT_IS, INFOSERVICE_CLASS, INFOSERVICE_CLASS, INFOSERVICE_CLASS, 'fact_car_sales', 'Факты продаж автомобилей', {
      id: FACT_IS, table: 'fact_car_sales', connector: conn, onoff: false,
    }),
    m(fAuto, FACT_IS, IS_FIELDS, 'Fields', 'dim_auto_id', 'Автомобиль', {
      id: fAuto, nameField: 'dim_auto_id', type: 'integer', guide: auto, virtual: false, calculated: false,
      hierarchy: true, subtotal: true, isOrderOn: true, onoff: false, ref: auto,
      refOrderField: L(GUIDE_AUTO, autoSort), refOrderDirection: 'ASC', SQLQueryFormat: 'useWith',
    }),
    m(fDate, FACT_IS, IS_FIELDS, 'Fields', 'report_date', 'Отчетная дата', {
      id: fDate, nameField: 'report_date', type: 'date', virtual: false, calculated: false,
      hierarchy: false, subtotal: false, isOrderOn: false, onoff: false,
    }),
    m(fRegion, FACT_IS, IS_FIELDS, 'Fields', 'dim_region_id', 'Регион', {
      id: fRegion, nameField: 'dim_region_id', type: 'integer', guide: region, virtual: false, calculated: false,
      hierarchy: true, subtotal: true, isOrderOn: true, onoff: false, ref: region,
      refOrderField: L(GUIDE_REGION, regionSort), refOrderDirection: 'ASC', SQLQueryFormat: 'useWith',
    }),
    m(fCalc, FACT_IS, IS_FIELDS, 'Fields', 'dim_calc_method_id', 'Способ расчета', {
      id: fCalc, nameField: 'dim_calc_method_id', type: 'integer', guide: calc, virtual: false, calculated: false,
      hierarchy: false, subtotal: false, isOrderOn: false, onoff: false, ref: calc, SQLQueryFormat: 'useWith',
    }),
    m(fQty, FACT_IS, IS_FIELDS, 'Fields', 'quantity_sold', 'Продано', {
      id: fQty, nameField: 'quantity_sold', type: 'float', virtual: false, calculated: false,
      hierarchy: false, subtotal: false, isOrderOn: false, onoff: false,
    }),
    m(fRev, FACT_IS, IS_FIELDS, 'Fields', 'revenue_amount', 'Выручка', {
      id: fRev, nameField: 'revenue_amount', type: 'float', virtual: false, calculated: false,
      hierarchy: false, subtotal: false, isOrderOn: false, onoff: false,
    }),
    m(fPrice, FACT_IS, IS_FIELDS, 'Fields', 'avg_price', 'Цена', {
      id: fPrice, nameField: 'avg_price', type: 'float', virtual: false, calculated: false,
      hierarchy: false, subtotal: false, isOrderOn: false, onoff: false,
    }),
    m('63fff868-058d-44dc-ae9e-3bcf873e5079', fAuto, BINDS, 'Binds', 'Автомобиль', 'Автомобиль', {
      ref: auto, field: L(IS_FIELDS, fAuto), refField: L(GUIDE_AUTO, autoId),
    }),
    m('0fee6581-6869-4635-97ea-9f1903fd6bf0', fRegion, BINDS, 'Binds', 'Регион', 'Регион', {
      ref: region, field: L(IS_FIELDS, fRegion), refField: L(GUIDE_REGION, regionId),
    }),
    m('2cd8da03-35c2-44a0-986c-eef28739ceac', fCalc, BINDS, 'Binds', 'СпособРасчета', 'Способ расчета', {
      ref: calc, field: L(IS_FIELDS, fCalc), refField: L(GUIDE_CALC, calcId),
    }),

    m(PLAN_IS, INFOSERVICE_CLASS, INFOSERVICE_CLASS, 'Infoservice', 'plan_fact_sales', 'План продаж автомобилей', {
      id: PLAN_IS, table: 'plan_car_sales', connector: conn, onoff: false,
    }),
    m(pAuto, PLAN_IS, IS_FIELDS, 'Fields', 'dim_auto_id', 'Автомобиль', {
      nameField: 'dim_auto_id', type: 'integer', guide: auto, virtual: false, calculated: false,
      hierarchy: true, subtotal: true, isOrderOn: true, onoff: false, ref: auto,
      refOrderField: L(GUIDE_AUTO, autoSort), refOrderDirection: 'ASC', SQLQueryFormat: 'useWith', id: pAuto,
    }),
    m('efe28137-6fb0-423d-a041-86f34d44b155', pAuto, BINDS, 'Binds', 'Автомобиль', 'Автомобиль', {
      ref: auto, field: L(IS_FIELDS, pAuto), refField: L(GUIDE_AUTO, autoId), id: 'efe28137-6fb0-423d-a041-86f34d44b155',
    }),
    m(pDate, PLAN_IS, IS_FIELDS, 'Fields', 'report_date', 'Отчетная дата', {
      nameField: 'report_date', type: 'date', virtual: false, calculated: false,
      hierarchy: false, subtotal: false, isOrderOn: false, onoff: false, id: pDate,
    }),
    m(pRegion, PLAN_IS, IS_FIELDS, 'Fields', 'dim_region_id', 'Регион', {
      nameField: 'dim_region_id', type: 'integer', guide: region, virtual: false, calculated: false,
      hierarchy: true, subtotal: true, isOrderOn: true, onoff: false, ref: region,
      refOrderField: L(GUIDE_REGION, regionSort), refOrderDirection: 'ASC', SQLQueryFormat: 'useWith', id: pRegion,
    }),
    m('cbbc0b50-5a3f-4dc2-b9ae-381b3461e849', pRegion, BINDS, 'Binds', 'Регион', 'Регион', {
      ref: region, field: L(IS_FIELDS, pRegion), refField: L(GUIDE_REGION, regionId), id: 'cbbc0b50-5a3f-4dc2-b9ae-381b3461e849',
    }),
    m(pCalc, PLAN_IS, IS_FIELDS, 'Fields', 'dim_calc_method_id', 'Способ расчета', {
      nameField: 'dim_calc_method_id', type: 'integer', guide: calc, virtual: false, calculated: false,
      hierarchy: false, subtotal: false, isOrderOn: false, onoff: false, ref: calc, SQLQueryFormat: 'useWith', id: pCalc,
    }),
    m('6c9ae13a-a0fc-4b62-bcf5-f71f93244ee5', pCalc, BINDS, 'Binds', 'СпособРасчета', 'Способ расчета', {
      ref: calc, field: L(IS_FIELDS, pCalc), refField: L(GUIDE_CALC, calcId), id: '6c9ae13a-a0fc-4b62-bcf5-f71f93244ee5',
    }),
    m(pQty, PLAN_IS, IS_FIELDS, 'Fields', 'quantity_sold', 'Продано', {
      nameField: 'quantity_sold', type: 'float', virtual: false, calculated: false,
      hierarchy: false, subtotal: false, isOrderOn: false, onoff: false, id: pQty,
    }),
    m(pRev, PLAN_IS, IS_FIELDS, 'Fields', 'revenue_amount', 'Выручка', {
      nameField: 'revenue_amount', type: 'float', virtual: false, calculated: false,
      hierarchy: false, subtotal: false, isOrderOn: false, onoff: false, id: pRev,
    }),
    m(pPrice, PLAN_IS, IS_FIELDS, 'Fields', 'avg_price', 'Цена', {
      nameField: 'avg_price', type: 'float', virtual: false, calculated: false,
      hierarchy: false, subtotal: false, isOrderOn: false, onoff: false, id: pPrice,
    }),

    m(CUBE_ID, CUBES_CLASS, CUBES_CLASS, 'Cubes', 'ПродажиАвтомобилей', 'OLAP-куб данных продаж автомобилей', {
      id: CUBE_ID,
    }),
    m(LAYER_FACT, CUBE_ID, CUBE_LAYERS, 'Infoservices', 'Факт', 'Факт', {
      id: LAYER_FACT, infoserviceId: FACT_IS, ref: L(INFOSERVICE_CLASS, FACT_IS),
    }),
    m(LAYER_PLAN, CUBE_ID, CUBE_LAYERS, 'Infoservices', 'План', 'План', {
      ref: L(INFOSERVICE_CLASS, PLAN_IS),
    }),
    m(dAuto, CUBE_ID, CUBE_DIMS, 'Dimensions', 'Автомобиль', 'Автомобиль', {
      id: dAuto, onoff: false, nameField: 'dim_auto_id', type: 'integer', totalsOnoff: false,
    }),
    m(dDate, CUBE_ID, CUBE_DIMS, 'Dimensions', 'ОтчетнаяДата', 'Отчетная дата', {
      id: dDate, onoff: false, dateDimension: true, accountDimension: false, nameField: 'report_date', type: 'date', totalsOnoff: false,
    }),
    m(dRegion, CUBE_ID, CUBE_DIMS, 'Dimensions', 'Регион', 'Регион', {
      id: dRegion, onoff: false, nameField: 'dim_region_id', type: 'integer', totalsOnoff: false,
    }),
    m(dCalc, CUBE_ID, CUBE_DIMS, 'Dimensions', 'СпособРасчета', 'Способ расчета', {
      id: dCalc, onoff: false, dateDimension: false, accountDimension: false, nameField: 'dim_calc_method_id', type: 'integer', totalsOnoff: false,
    }),
    m(mQty, CUBE_ID, CUBE_MEAS, 'Measures', 'Продано', 'Продано', {
      id: mQty, format: 'count', aggrFunc: 'COUNT', onoff: false, nameField: 'quantity_sold', type: 'float', onoffFilter: false, useMeasure: false,
    }),
    m(mRev, CUBE_ID, CUBE_MEAS, 'Measures', 'Выручка', 'Выручка', {
      id: mRev, format: 'number', aggrFunc: 'SUM', onoff: false, nameField: 'revenue_amount', type: 'float', onoffFilter: false, useMeasure: true,
    }),
    m(mPrice, CUBE_ID, CUBE_MEAS, 'Measures', 'Цена', 'Цена', {
      id: mPrice, format: 'number', aggrFunc: 'AVG', onoff: false, nameField: 'avg_price', type: 'float', onoffFilter: false, useMeasure: true,
    }),
    m('f06a7061-bba2-4f39-b412-f7a50efb8db1', dAuto, CUBE_ISLIST, 'InfoserviseList', 'Факт', 'Факт', {
      infoservice: L(CUBE_LAYERS, LAYER_FACT), field: L(LAYER_FACT, fAuto),
    }),
    m('06245b9c-d610-46b4-905c-627df69c9764', dDate, CUBE_ISLIST, 'InfoserviseList', 'Факт', 'Факт', {
      infoservice: L(CUBE_LAYERS, LAYER_FACT), field: L(LAYER_FACT, fDate),
    }),
    m('de119023-f678-4cae-82d5-a26288fb76cf', dRegion, CUBE_ISLIST, 'InfoserviseList', 'Факт', 'Факт', {
      infoservice: L(CUBE_LAYERS, LAYER_FACT), field: L(LAYER_FACT, fRegion),
    }),
    m('a42efea2-af21-45d2-a360-5b5dd3d093de', dCalc, CUBE_ISLIST, 'InfoserviseList', 'Факт', 'Факт', {
      infoservice: L(CUBE_LAYERS, LAYER_FACT), field: L(LAYER_FACT, fCalc),
    }),
    m('25df1aeb-9402-4e05-b4b9-09dbd3b1aa14', mQty, CUBE_ISLIST, 'InfoserviseList', 'Факт', 'Факт', {
      infoservice: L(CUBE_LAYERS, LAYER_FACT), field: L(LAYER_FACT, fQty),
    }),
    m('51afdd06-9c20-4bec-87df-c7b365035966', mRev, CUBE_ISLIST, 'InfoserviseList', 'Факт', 'Факт', {
      infoservice: L(CUBE_LAYERS, LAYER_FACT), field: L(LAYER_FACT, fRev),
    }),
    m('a9eedb4a-a6fe-4ee0-9e38-1639a09a9ebb', mPrice, CUBE_ISLIST, 'InfoserviseList', 'Факт', 'Факт', {
      infoservice: L(CUBE_LAYERS, LAYER_FACT), field: L(LAYER_FACT, fPrice),
    }),
    m('030bff1f-55f4-49f6-9c3b-9821791abd53', dAuto, CUBE_ISLIST, 'InfoserviseList', 'План', 'План', {
      infoservice: L(CUBE_LAYERS, LAYER_PLAN), field: L(LAYER_PLAN, pAuto),
    }),
    m('0ecbf56c-c5c7-4457-b5f2-14fcfe85d44a', dDate, CUBE_ISLIST, 'InfoserviseList', 'План', 'План', {
      infoservice: L(CUBE_LAYERS, LAYER_PLAN), field: L(LAYER_PLAN, pDate),
    }),
    m('d22d8b04-1222-439a-912d-8dc7af7a920b', dRegion, CUBE_ISLIST, 'InfoserviseList', 'План', 'План', {
      infoservice: L(CUBE_LAYERS, LAYER_PLAN), field: L(LAYER_PLAN, pRegion),
    }),
    m('7cce9296-79db-46af-832c-753e0cefec6a', mQty, CUBE_ISLIST, 'InfoserviseList', 'План', 'План', {
      infoservice: L(CUBE_LAYERS, LAYER_PLAN), field: L(LAYER_PLAN, pQty),
    }),
    m('7598503a-63eb-4240-bb61-c07748de1c1e', mPrice, CUBE_ISLIST, 'InfoserviseList', 'План', 'План', {
      infoservice: L(CUBE_LAYERS, LAYER_PLAN), field: L(LAYER_PLAN, pPrice),
    }),
    m('fd10fdf0-887c-493d-ac9c-42e0ec49adca', mRev, CUBE_ISLIST, 'InfoserviseList', 'План', 'План', {
      infoservice: L(CUBE_LAYERS, LAYER_PLAN), field: L(LAYER_PLAN, pRev),
    }),
    m('482c82fb-48e9-4d5a-817f-102d487e6af9', dCalc, CUBE_ISLIST, 'InfoserviseList', 'План', 'План', {
      infoservice: L(CUBE_LAYERS, LAYER_PLAN), field: L(LAYER_PLAN, pCalc),
    }),

    m(REPORT_ID, REPORTS_CLASS, REPORTS_CLASS, 'Reports', 'ПродажиАвтомобилей', 'Продажи автомобилей', {}),
    m(rLayerFact, REPORT_ID, REP_LAYERS, 'Infoservices', 'Факт', 'Факт', {
      id: rLayerFact, ref: L(INFOSERVICE_CLASS, FACT_IS),
    }),
    m(rdAuto, REPORT_ID, REP_DIMS, 'Dimensions', 'Автомобиль', 'Автомобиль', {
      id: rdAuto, onoff: false, nameField: 'dim_auto_id', type: 'integer', dateDimension: false, accountDimension: false,
    }),
    m(rdDate, REPORT_ID, REP_DIMS, 'Dimensions', 'ОтчетнаяДата', 'Отчетная дата', {
      id: rdDate, onoff: false, nameField: 'report_date', type: 'date', dateDimension: false, accountDimension: false,
    }),
    m(rdRegion, REPORT_ID, REP_DIMS, 'Dimensions', 'Регион', 'Регион', {
      id: rdRegion, onoff: false, nameField: 'dim_region_id', type: 'integer', dateDimension: false, accountDimension: false,
    }),
    m(rdCalc, REPORT_ID, REP_DIMS, 'Dimensions', 'СпособРасчета', 'Способ расчета', {
      id: rdCalc, onoff: false, nameField: 'dim_calc_method_id', type: 'integer', dateDimension: false, accountDimension: false,
    }),
    m(rmQty, REPORT_ID, REP_MEAS, 'Measures', 'Продано', 'Продано', {
      id: rmQty, onoff: false, nameField: 'quantity_sold', type: 'float', format: 'number', useMeasure: true,
    }),
    m(rmRev, REPORT_ID, REP_MEAS, 'Measures', 'Выручка', 'Выручка', {
      id: rmRev, onoff: false, nameField: 'revenue_amount', type: 'float', format: 'number', useMeasure: true,
    }),
    m(rmPrice, REPORT_ID, REP_MEAS, 'Measures', 'Цена', 'Цена', {
      id: rmPrice, onoff: false, nameField: 'avg_price', type: 'float', format: 'number', useMeasure: true,
    }),
    m('29f2764f-e6d5-4504-96fd-b7ab6aa2e92d', rmQty, REP_ISLIST, 'InfoserviseList', 'Факт', 'Факт', {
      infoservice: L(REP_LAYERS, rLayerFact), field: L(rLayerFact, fQty),
    }),
    m('a0ec396f-153f-4591-bad8-6c1bf025675c', rdAuto, REP_ISLIST, 'InfoserviseList', 'Факт', 'Факт', {
      infoservice: L(REP_LAYERS, rLayerFact), field: L(rLayerFact, fAuto),
    }),
    m('a036df61-b82f-4740-b5c7-7a5a61afa1a9', rdDate, REP_ISLIST, 'InfoserviseList', 'Факт', 'Факт', {
      infoservice: L(REP_LAYERS, rLayerFact), field: L(rLayerFact, fDate),
    }),
    m('29cf0f31-740b-462c-b454-d86049691c85', rmRev, REP_ISLIST, 'InfoserviseList', 'Факт', 'Факт', {
      infoservice: L(REP_LAYERS, rLayerFact), field: L(rLayerFact, fRev),
    }),
    m('d20c21ac-3d62-431a-b833-0a030c05f271', rmPrice, REP_ISLIST, 'InfoserviseList', 'Факт', 'Факт', {
      infoservice: L(REP_LAYERS, rLayerFact), field: L(rLayerFact, fPrice),
    }),
    m('ecc842c9-0fd9-439d-a2e5-83b6ed663d4d', rdRegion, REP_ISLIST, 'InfoserviseList', 'Факт', 'Факт', {
      infoservice: L(REP_LAYERS, rLayerFact), field: L(rLayerFact, fRegion),
    }),
    m('a3d5d907-9f3b-4714-a2bf-6b8ccd4ee603', rdCalc, REP_ISLIST, 'InfoserviseList', 'Факт', 'Факт', {
      infoservice: L(REP_LAYERS, rLayerFact), field: L(rLayerFact, fCalc),
    }),
    m(rLayerPlan, REPORT_ID, REP_LAYERS, 'Infoservices', 'План', 'План', {
      ref: L(INFOSERVICE_CLASS, PLAN_IS),
    }),
    m('a0fdf24c-c8ed-471b-9b8b-77531116cac4', rdCalc, REP_ISLIST, 'InfoserviseList', 'План', 'План', {
      infoservice: L(REP_LAYERS, rLayerPlan), field: L(PLAN_IS, pCalc),
    }),
    m('a6178078-c7e7-45d7-80cd-4dbb86096774', rdRegion, REP_ISLIST, 'InfoserviseList', 'План', 'План', {
      infoservice: L(REP_LAYERS, rLayerPlan), field: L(PLAN_IS, pRegion),
    }),
    m('871ccaf3-0409-49f4-9702-99cfd3ef5075', rdDate, REP_ISLIST, 'InfoserviseList', 'План', 'План', {
      infoservice: L(REP_LAYERS, rLayerPlan), field: L(PLAN_IS, pDate),
    }),
    m('61fb8ead-ec51-4c01-ab2c-c496230f51bd', rdAuto, REP_ISLIST, 'InfoserviseList', 'План', 'План', {
      infoservice: L(REP_LAYERS, rLayerPlan), field: L(PLAN_IS, pAuto),
    }),
    m('e0a388f5-fbb2-4883-9984-e3601800269f', rmPrice, REP_ISLIST, 'InfoserviseList', 'План', 'План', {
      infoservice: L(REP_LAYERS, rLayerPlan), field: L(PLAN_IS, pPrice),
    }),
    m('6a004e0e-1193-400f-b56b-7a3c69635ecc', rmRev, REP_ISLIST, 'InfoserviseList', 'План', 'План', {
      infoservice: L(REP_LAYERS, rLayerPlan), field: L(PLAN_IS, pRev),
    }),
    m('39d48c40-5e3a-4079-b1c6-0bbc40a17b55', rmQty, REP_ISLIST, 'InfoserviseList', 'План', 'План', {
      infoservice: L(REP_LAYERS, rLayerPlan), field: L(PLAN_IS, pQty),
    }),
  ];
}
