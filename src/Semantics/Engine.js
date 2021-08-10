import { Scope } from './Scope';
import { ScalarVariable } from './Variables/ScalarVariable';
import { EnumVariable } from './Variables/EnumVariable';
import { TypesIds } from './Variables/TypesIds';
import { VariablesDeclaration } from '../SyntaxAnalyzer/Tree/VariablesDeclaration';
import { TypeDeclaration } from '../SyntaxAnalyzer/Tree/TypeDeclaration';
import { ConstantDeclaration } from '../SyntaxAnalyzer/Tree/ConstantDeclaration';
import { ScalarType } from '../SyntaxAnalyzer/Tree/Types/ScalarType';
import { ArrayType } from '../SyntaxAnalyzer/Tree/Types/ArrayType';
import { Identifier } from '../SyntaxAnalyzer/Tree/Identifier';
import { Assignation } from '../SyntaxAnalyzer/Tree/Assignation';
import { SymbolsCodes } from '../LexicalAnalyzer/SymbolsCodes';
import { Constant } from '../SyntaxAnalyzer/Tree/Constant';
import { NmbFloat } from '../LexicalAnalyzer/Symbols/NmbFloat';
import { NmbInt } from '../LexicalAnalyzer/Symbols/NmbInt';
import { OneSymbol } from '../LexicalAnalyzer/Symbols/OneSymbol';
import { StringConstant } from '../LexicalAnalyzer/Symbols/StringConstant';
import { Addition } from '../SyntaxAnalyzer/Tree/Addition';
import { Subtraction } from '../SyntaxAnalyzer/Tree/Subtraction';
import { Multiplication } from '../SyntaxAnalyzer/Tree/Multiplication';
import { Division } from '../SyntaxAnalyzer/Tree/Division';
import { IntegerDivision } from '../SyntaxAnalyzer/Tree/IntegerDivision';
import { Modulo } from '../SyntaxAnalyzer/Tree/Modulo';
import { LogicalAnd } from '../SyntaxAnalyzer/Tree/LogicalAnd';
import { LogicalOr } from '../SyntaxAnalyzer/Tree/LogicalOr';
import { UnaryMinus } from '../SyntaxAnalyzer/Tree/UnaryMinus';
import { CompoundOperator } from '../SyntaxAnalyzer/Tree/CompoundOperator';
import { Implication } from '../SyntaxAnalyzer/Tree/Implication';
import { WhileCycle } from '../SyntaxAnalyzer/Tree/Loops/WhileCycle';
import { RepeatCycle } from '../SyntaxAnalyzer/Tree/Loops/RepeatCycle';
import { ForCycle } from '../SyntaxAnalyzer/Tree/Loops/ForCycle';
import { ProcedureCall } from '../SyntaxAnalyzer/Tree/ProcedureCall';
import { FunctionCall } from '../SyntaxAnalyzer/Tree/FunctionCall';
import { In } from '../SyntaxAnalyzer/Tree/Relations/In';
import { Equal } from '../SyntaxAnalyzer/Tree/Relations/Equal';
import { NotEqual } from '../SyntaxAnalyzer/Tree/Relations/NotEqual';
import { Less } from '../SyntaxAnalyzer/Tree/Relations/Less';
import { Greater } from '../SyntaxAnalyzer/Tree/Relations/Greater';
import { GreaterOrEqual } from '../SyntaxAnalyzer/Tree/Relations/GreaterOrEqual';
import { LessOrEqual } from '../SyntaxAnalyzer/Tree/Relations/LessOrEqual';
import { ProceduresStore } from './ProceduresStore';
import { FunctionsStore } from './FunctionsStore';
import { RuntimeError } from '../Errors/RuntimeError';
import { ErrorsDescription } from '../Errors/ErrorsDescription';
import { ErrorsCodes } from '../Errors/ErrorsCodes';
import { Break } from  '../SyntaxAnalyzer/Tree/Break';

export class Engine
{
    constructor(tree, config)
    {
        this.tree = tree;
        this.trees = [this.tree];
        this.treesCounter = 0;
        this.scopes = [];
        this.currentScopeId = 0;
        this.scopes[this.currentScopeId] = new Scope();
        this.proceduresStore = new ProceduresStore(config.outputStream, config.ouputNewLineSymbol);
        this.functionsStore = new FunctionsStore();
        this.errorsDescription = new ErrorsDescription();
    }
    /**
     * @type Scope
     */
    getCurrentScope()
    {
        return this.scopes[this.currentScopeId];
    }

    run()
    {
        this.setConstants();
        this.setTypes();
        this.setVariables();

        let self = this;
        if (this.tree.sentences) {
            this.tree.sentences.forEach(
                function(sentence)
                {
                    self.evaluateSentence(sentence);
                }
            );
        }

//        console.dir(this.scopes, { depth: null });
    }

    setVariables()
    {
        let currentScope = this.getCurrentScope();

        if (this.tree.vars) {
            this.tree.vars.forEach(function (variablesDeclaration) {
                if (variablesDeclaration instanceof VariablesDeclaration) {

                    let variablesType = variablesDeclaration.variablesType;

                    variablesDeclaration.identifiers.forEach(
                        function(identifier)
                        {
                            if (identifier instanceof Identifier) {
                                let name = identifier.symbol.value;
                                currentScope.addVariable(name, variablesDeclaration.variablesType, null, identifier);

                            } else {
                                throw 'Identifier must be here!';
                            }
                        }
                    );
                } else {
                    throw 'VariablesDeclaration object must be here!';
                }
            });
        }
    }

    setTypes()
    {
        let currentScope = this.getCurrentScope();

        if (this.tree.types) {
            this.tree.types.forEach(function (typeDeclaration) {
                if (typeDeclaration instanceof TypeDeclaration) {

                    currentScope.addType(typeDeclaration);

                } else {
                    throw 'TypeDeclaration object must be here!';
                }
            });
        }
    }

    setConstants()
    {
        let currentScope = this.getCurrentScope();

        if (this.tree.constants) {
            this.tree.constants.forEach(function (constantDeclaration) {
                if (constantDeclaration instanceof ConstantDeclaration) {

                    currentScope.addConstant(constantDeclaration);

                } else {
                    throw 'ConstantDeclaration object must be here!';
                }
            });
        }
    }

    evaluateSentence(sentence)
    {
        let currentScope = this.getCurrentScope();

        if (sentence instanceof Assignation) {
            let identifier = sentence.destination.symbol.stringValue;
            let sourceExpression = sentence.sourceExpression;
            let expressionResult = this.evaluateExpression(sourceExpression);
            let type = expressionResult.getType();
            let value = expressionResult.value;

            currentScope.setValue(identifier, type, value, sentence.destination);
        } else if (sentence instanceof CompoundOperator) {
            if (sentence.sentences) {
                let sentences = sentence.sentences;
                let sentencesNumber = sentences.length;
                for (let i = 0; i < sentencesNumber; i++) {
                    let result = this.evaluateSentence(sentences[i]);
                    if (result instanceof Break) {
                        return result;
                    }
                }
            }
        } else if (sentence instanceof Implication) {
            let condition = this.evaluateExpression(sentence.condition);

            if (condition.value === true) {
                return this.evaluateSentence(sentence.left);
            } else {
                return this.evaluateSentence(sentence.right);
            }
        } else if (sentence instanceof ProcedureCall) {

            let procedureName = sentence.identifier.symbol.value;

            let isDeclaredProcedure = this.tree.procedures.hasOwnProperty(procedureName);
            let procedure = isDeclaredProcedure ?
                this.tree.procedures[procedureName]:
                this.proceduresStore.getProcedure(procedureName);

            if (procedure === null) {
                this.addError(ErrorsCodes.nameNotDescribed, `Procedure '${procedureName}' is not declared!`, sentence.identifier);
            }

            let scope = new Scope();
            this.addParametersToScope(sentence.parameters, procedure.signature, scope);
            this.treesCounter++;
            this.tree = procedure;
            this.currentScopeId++;
            this.scopes[this.currentScopeId] = scope;

            this.run();

            if (!isDeclaredProcedure &&
                typeof procedure.innerRun === 'function' ) {
                procedure.innerRun(scope);
            }

            delete this.scopes[this.currentScopeId];

            this.currentScopeId--;
            this.treesCounter--;
            this.tree = this.trees[this.treesCounter];
        } else if (sentence instanceof WhileCycle) {
            let currentScope = this.getCurrentScope();
            currentScope.cycleDepth++;
            while (this.evaluateExpression(sentence.condition).value === true) {
                let result = this.evaluateSentence(sentence.body);
                if (result instanceof Break) {
                    break;
                }
            }
            currentScope.cycleDepth--;
        } else if (sentence instanceof RepeatCycle) {
            let currentScope = this.getCurrentScope();
            currentScope.cycleDepth++;
            do {
                let result = this.evaluateSentence(sentence.body);
                if (result instanceof Break) {
                    break;
                }
            } while (this.evaluateExpression(sentence.condition).value !== true)
            currentScope.cycleDepth--;
        } else if (sentence instanceof ForCycle) {
            let currentScope = this.getCurrentScope();
            let variableName = sentence.variableIdentifier.symbol.stringValue;
            let currentValue = this.evaluateExpression(sentence.initExpression);
            let lastValue = this.evaluateExpression(sentence.lastExpression);

            let increment = null;
            let comparation = null;
            let typeId = currentValue.typeId;
            let type = currentValue.type === false ? typeId : currentValue.type;
            currentScope.setValue(variableName, type, currentValue.value);
            if (sentence.countDown) {
                switch (typeId) {
                    case TypesIds.INTEGER:
                        increment = function(elem) {
                            elem.value--;
                            return elem;
                        };
                        comparation = (leftElem, rightElem) => leftElem.value >= rightElem.value;
                        break;
                    case TypesIds.CHAR:
                        increment = function(elem) {
                            let code = elem.value.charCodeAt(0);
                            code--;
                            elem.value = String.fromCharCode(code);
                            return elem;
                        };
                        comparation = (leftElem, rightElem) => leftElem.value.charCodeAt(0) >= rightElem.value.charCodeAt(0);
                        break;
                    case TypesIds.ENUM:
                        increment = function(elem) {
                            let items = elem.type.items;
                            let len = items.length;
                            let index = elem.getIndex();
                            index--;
                            elem.value = items[(index + len) % len];
                            return elem;
                        };
                        comparation = (leftElem, rightElem) => leftElem.getIndex() >= rightElem.getIndex();
                        break;
                }
            } else {
                switch (typeId) {
                    case TypesIds.INTEGER:
                        increment = function(elem) {
                            elem.value++;
                            return elem;
                        };
                        comparation = (leftElem, rightElem) => leftElem.value <= rightElem.value;
                        break;
                    case TypesIds.CHAR:
                        increment = function(elem) {
                            let code = elem.value.charCodeAt(0);
                            code++;
                            elem.value = String.fromCharCode(code);
                            return elem;
                        };
                        comparation = (leftElem, rightElem) => leftElem.value.charCodeAt(0) <= rightElem.value.charCodeAt(0);
                        break;
                    case TypesIds.ENUM:
                        increment = function(elem) {
                            let items = elem.type.items;
                            let len = items.length;
                            let index = elem.getIndex();
                            index++;
                            elem.value = items[index % len];
                            return elem;
                        };
                        comparation = (leftElem, rightElem) => leftElem.getIndex() <= rightElem.getIndex();
                        break;
                }
            }
            currentScope.cycleDepth++;
            this.evaluateSentence(sentence.init);
            let previousVal = typeId === TypesIds.ENUM ?
                new EnumVariable(currentValue.value, type) :
                new ScalarVariable(currentValue.value, typeId);
            let canContinue = true;
            while (comparation(currentValue, lastValue) && canContinue) {
                let result = this.evaluateSentence(sentence.body);
                if (result instanceof Break) {
                    break;
                }
                previousVal.value = currentValue.value;
                currentValue = increment(currentValue);
                currentScope.setValue(variableName, type, currentValue.value);
                canContinue = comparation(previousVal, currentValue);
            }
            currentScope.cycleDepth--;
        } else if (sentence instanceof Break) {
            let currentScope = this.getCurrentScope();
            if (currentScope.cycleDepth <= 0) {
                this.addError(ErrorsCodes.breakOutOfLoop, null, sentence);
            } else {
                return sentence;
            }
        }
    }

    addParametersToScope(parameters, signature, scope)
    {
        let parametersValues = parameters.map(elem => this.evaluateExpression(elem));
        if (signature.length === 0) {
            scope.setParametersList(parametersValues);
        } else {
            let parametersCounter = 0;
            signature.forEach(function(appliedType) {
                let identifiers = appliedType.identifiers;
                identifiers.forEach(function(identifier) {
                    let variableName = identifier.symbol.value;
                    let typeId = appliedType.typeId;
                    let value = parametersValues[parametersCounter].value;
                    scope.addVariable(variableName, typeId);
                    scope.setValue(variableName, typeId, value);
                    parametersCounter++;
                });
            });
        }
    }

    evaluateExpression(expression)
    {
        if (expression instanceof Equal) {
            let leftOperand = this.evaluateExpression(expression.left);
            let rightOperand = this.evaluateExpression(expression.right);
            let typeId = TypesIds.BOOLEAN;
            let result = null;
            if (leftOperand.typeId === TypesIds.ENUM &&
                rightOperand.typeId === TypesIds.ENUM &&
                Object.is(leftOperand.type, rightOperand.type)) {
                result = leftOperand.getIndex() !== rightOperand.getIndex();
            } else {
                result = leftOperand.value === rightOperand.value;
            }

            return new ScalarVariable(result, typeId);
        } else if (expression instanceof Greater) {
            let leftOperand = this.evaluateExpression(expression.left);
            let rightOperand = this.evaluateExpression(expression.right);
            let typeId = TypesIds.BOOLEAN;
            let result = null;
            if (leftOperand.typeId === TypesIds.CHAR &&
                rightOperand.typeId === TypesIds.CHAR) {
                result = leftOperand.value.charCodeAt(0) > rightOperand.value.charCodeAt(0);
            } else if(  leftOperand.typeId === TypesIds.ENUM &&
                        rightOperand.typeId === TypesIds.ENUM &&
                        Object.is(leftOperand.type, rightOperand.type)) {
                result = leftOperand.getIndex() > rightOperand.getIndex();
            } else {
                result = leftOperand.value > rightOperand.value;
            }
            return new ScalarVariable(result, typeId);
        } else if (expression instanceof Less) {
            let leftOperand = this.evaluateExpression(expression.left);
            let rightOperand = this.evaluateExpression(expression.right);
            let typeId = TypesIds.BOOLEAN;
            let result = null;
            if (leftOperand.typeId === TypesIds.CHAR &&
                rightOperand.typeId === TypesIds.CHAR) {
                result = leftOperand.value.charCodeAt(0) < rightOperand.value.charCodeAt(0);
            } else if(  leftOperand.typeId === TypesIds.ENUM &&
                        rightOperand.typeId === TypesIds.ENUM &&
                        Object.is(leftOperand.type, rightOperand.type)) {
                result = leftOperand.getIndex() < rightOperand.getIndex();
            } else {
                result = leftOperand.value < rightOperand.value;
            }

            return new ScalarVariable(result, typeId);
        } else if (expression instanceof GreaterOrEqual) {
            let leftOperand = this.evaluateExpression(expression.left);
            let rightOperand = this.evaluateExpression(expression.right);
            let typeId = TypesIds.BOOLEAN;
            let result = null;
            if (leftOperand.typeId === TypesIds.CHAR &&
                rightOperand.typeId === TypesIds.CHAR) {
                result = leftOperand.value.charCodeAt(0) >= rightOperand.value.charCodeAt(0);
            } else if(  leftOperand.typeId === TypesIds.ENUM &&
                        rightOperand.typeId === TypesIds.ENUM &&
                        Object.is(leftOperand.type, rightOperand.type)) {
                result = leftOperand.getIndex() >= rightOperand.getIndex();
            } else {
                result = leftOperand.value >= rightOperand.value;
            }

            return new ScalarVariable(result, typeId);
        } else if (expression instanceof LessOrEqual) {
            let leftOperand = this.evaluateExpression(expression.left);
            let rightOperand = this.evaluateExpression(expression.right);
            let typeId = TypesIds.BOOLEAN;
            let result = null;
            if (leftOperand.typeId === TypesIds.CHAR &&
                rightOperand.typeId === TypesIds.CHAR) {
                result = leftOperand.value.charCodeAt(0) <= rightOperand.value.charCodeAt(0);
            } else if(  leftOperand.typeId === TypesIds.ENUM &&
                        rightOperand.typeId === TypesIds.ENUM &&
                        Object.is(leftOperand.type, rightOperand.type)) {
                result = leftOperand.getIndex() <= rightOperand.getIndex();
            } else {
                result = leftOperand.value <= rightOperand.value;
            }

            return new ScalarVariable(result, typeId);
        } else if (expression instanceof NotEqual) {
            let leftOperand = this.evaluateExpression(expression.left);
            let rightOperand = this.evaluateExpression(expression.right);
            let typeId = TypesIds.BOOLEAN;
            let result = null;
            if (leftOperand.typeId === TypesIds.ENUM &&
                rightOperand.typeId === TypesIds.ENUM &&
                Object.is(leftOperand.type, rightOperand.type)) {
                result = leftOperand.getIndex() !== rightOperand.getIndex();
            } else {
                result = leftOperand.value !== rightOperand.value;
            }

            return new ScalarVariable(result, typeId);
        } else if (expression instanceof In) {
            let leftOperand = this.evaluateExpression(expression.left);
            let rightOperand = this.evaluateExpression(expression.right);
            let typeId = TypesIds.BOOLEAN;
            let result = false;

            return new ScalarVariable(result, typeId)
        } else {
            return this.evaluateSimpleExpression(expression);
        }
    }

    evaluateSimpleExpression(expression)
    {
        if (expression instanceof Addition ||
                expression instanceof Subtraction) {

            let leftOperand = this.evaluateSimpleExpression(expression.left);
            let rightOperand = this.evaluateSimpleExpression(expression.right);
            let typeId = leftOperand.typeId === TypesIds.REAL ||
                    rightOperand.typeId === TypesIds.REAL ? TypesIds.REAL : TypesIds.INTEGER;

            let result = null;
            if (expression instanceof Addition) {
                result = leftOperand.value + rightOperand.value;
            } else if (expression instanceof Subtraction) {
                result = leftOperand.value - rightOperand.value;
            }

            return new ScalarVariable(result, typeId);
        } else if (expression instanceof LogicalOr) {
            let leftOperand = this.evaluateSimpleExpression(expression.left);
            let rightOperand = this.evaluateSimpleExpression(expression.right);
            let typeId = TypesIds.BOOLEAN;
            let result = leftOperand.value || rightOperand.value;

            return new ScalarVariable(result, typeId);
        } else {
            return this.evaluateTerm(expression);
        }
    }

    evaluateTerm(expression)
    {
        if (expression instanceof UnaryMinus) {
            let term = this.evaluateTerm(expression.value);
            return new ScalarVariable(-term.value, term.typeId);
        } else if (expression instanceof Multiplication) {
            let leftOperand = this.evaluateMultiplier(expression.left);
            let rightOperand = this.evaluateMultiplier(expression.right);
            let typeId = leftOperand.typeId === TypesIds.REAL ||
                    rightOperand.typeId === TypesIds.REAL ? TypesIds.REAL : TypesIds.INTEGER;
            let result = leftOperand.value * rightOperand.value;

            return new ScalarVariable(result, typeId);
        } else if (expression instanceof Division) {
            let leftOperand = this.evaluateMultiplier(expression.left);
            let rightOperand = this.evaluateMultiplier(expression.right);
            let typeId = TypesIds.REAL;
            let result = leftOperand.value / rightOperand.value;

            return new ScalarVariable(result, typeId);
        } else if (expression instanceof IntegerDivision) {
            let leftOperand = this.evaluateMultiplier(expression.left);
            let rightOperand = this.evaluateMultiplier(expression.right);
            let typeId = TypesIds.INTEGER;
            let result = Math.trunc(leftOperand.value / rightOperand.value);

            return new ScalarVariable(result, typeId);
        } else if (expression instanceof Modulo) {
            let leftOperand = this.evaluateMultiplier(expression.left);
            let rightOperand = this.evaluateMultiplier(expression.right);
            let typeId = TypesIds.INTEGER;
            let result = leftOperand.value % rightOperand.value;

            return new ScalarVariable(result, typeId);
        } else if (expression instanceof LogicalAnd) {
            let leftOperand = this.evaluateMultiplier(expression.left);
            let rightOperand = this.evaluateMultiplier(expression.right);
            let typeId = TypesIds.BOOLEAN;
            let result = leftOperand.value && rightOperand.value;

            return new ScalarVariable(result, typeId);
        } else {
            return this.evaluateMultiplier(expression);
        }
    }

    evaluateMultiplier(expression)
    {
        if (expression instanceof Constant) {
            return new ScalarVariable(expression.symbol.value, expression.typeId);
        } else if (expression instanceof Identifier) {
            let currentScope = this.getCurrentScope();
            return currentScope.getElementByIdentifier(expression);
        } else if (expression instanceof FunctionCall) {

            let functionName = expression.identifier.symbol.value;
            let isDeclaredFunction = this.tree.functions.hasOwnProperty(functionName);
            let calledFunction = isDeclaredFunction ?
                this.tree.functions[functionName]:
                this.functionsStore.getFunction(functionName);

            if (calledFunction === null) {
                this.addError(ErrorsCodes.nameNotDescribed, `Function '${functionName}' is not declared!`, expression.identifier);
            }

            let scope = new Scope();

            scope.addVariable(functionName, calledFunction.returnType);
            this.addParametersToScope(expression.parameters, calledFunction.signature, scope);
            this.treesCounter++;
            this.tree = calledFunction;
            this.currentScopeId++;
            this.scopes[this.currentScopeId] = scope;

            this.run();

            if (!isDeclaredFunction &&
                typeof calledFunction.innerRun === 'function' ) {
                calledFunction.innerRun(scope);
            }

            let result = scope.getVariable(functionName);
            delete this.scopes[this.currentScopeId];

            this.currentScopeId--;
            this.treesCounter--;
            this.tree = this.trees[this.treesCounter];

            return result;
        } else {
            return this.evaluateExpression(expression);
        }
    }

    addError(errorCode, errorText = null, treeNode = null)
    {
        let message = this.errorsDescription.getErrorTextByCode(errorCode) +
                (errorText === null ? '' : ('. ' + errorText));
        let currentPosition = treeNode === null ? null : treeNode.symbol.textPosition;
        throw new RuntimeError(errorCode, message, currentPosition);
    }
};