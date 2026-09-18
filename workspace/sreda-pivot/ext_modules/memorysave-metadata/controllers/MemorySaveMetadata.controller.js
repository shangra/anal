const MemorySaveMetadataServiceClass = require('../services/MemorySaveMetadata.service');
const MemorySaveMetadataService = new MemorySaveMetadataServiceClass();
/**
 * @swagger
 * tags:
 *   - name: MemorySaveMetadata
 *     description: Метаданные сохранения в памяти
 */
class MemorySaveMetadataController {
  /**
       * @swagger
       * /MemorySaveMetadata/{id}:
       *   delete:
       *     summary: Сохранить метаданные в памяти
       *     tags: [MemorySaveMetadata]
       *     produces:
       *       - application/json
       *     parameters:
       *       - name: id
       *         description: Идентификатор элемента
       *         in: path
       *         required: true
       *         type: string
       *     responses:
       *       200:
       *         description: Результат сохранения метаданных
       */
  static async memorySaveMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      let result = await MemorySaveMetadataService.memorySaveMetadata(id);
      res.send(result);
    } catch (e) {
      next(e);
    }
  }
  /**
       * @swagger
       * /MemorySaveMetadata/{id}/withRefs:
       *   delete:
       *     summary: Сохранить метаданные в памяти с ссылками
       *     tags: [MemorySaveMetadata]
       *     produces:
       *       - application/json
       *     parameters:
       *       - name: id
       *         description: Идентификатор элемента
       *         in: path
       *         required: true
       *         type: string
       *     responses:
       *       200:
       *         description: Результат сохранения метаданных с ссылками
       */
  static async memorySaveMetadataWithRefs(req, res, next) {
    try {
      const {
        id
      } = req.params;
      let result = await MemorySaveMetadataService.memorySaveMetadataWithRefs(id, {
        force: true
      });
      res.send(result);
    } catch (e) {
      next(e);
    }
  }
  /**
       * @swagger
       * /MemorySaveMetadata/{id}/body:
       *   delete:
       *     summary: Очистить кэш метаданных по телу запроса
       *     tags: [MemorySaveMetadata]
       *     produces:
       *       - application/json
       *     parameters:
       *       - name: id
       *         description: Идентификатор элемента
       *         in: path
       *         required: true
       *         type: string
       *     requestBody:
       *       description: Тело запроса
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *     responses:
       *       200:
       *         description: Результат очистки кеша метаданных
       */
  static async clearCacheMetadataByBody(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const {
        body
      } = req;
      let result = await MemorySaveMetadataService.clearCacheMetadataByBodyWithRefs({
        id,
        body
      }, {
        force: true
      });
      res.send(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = MemorySaveMetadataController;