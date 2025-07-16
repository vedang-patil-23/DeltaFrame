'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Holding extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Holding.init({
    asset: DataTypes.STRING,
    quantity: DataTypes.FLOAT,
    avgBuyPrice: DataTypes.FLOAT,
    active: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Holding',
  });
  return Holding;
};