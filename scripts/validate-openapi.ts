import SwaggerParser from '@apidevtools/swagger-parser';
await SwaggerParser.validate('specs/openapi.json');
console.log('Contrato OpenAPI validado.');
