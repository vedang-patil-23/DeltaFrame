'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.dropTable('Holdings');
  },
  async down(queryInterface, Sequelize) {
    // No-op: Holdings table is deprecated and should not be recreated
  }
};
