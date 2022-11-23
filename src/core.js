/**
 * range-calculator
 */

class Token {
  constructor(id, type, position){
    this.id   = id
    this.type = type
    this.position = position 
  }
}

const OP = 0
const Literal = 1
const Variable = 2

function createToken(id, type, position){
  return new Token(id, type, position)
}

function op(id, position){
  return createToken(id,OP, position)
}

function literal(id, position){
  return createToken(id, Literal, position)
}

function variable(id, position){
  return createToken(id, Variable, position)
}

const state = {
  start : Symbol('0'),
  letter : Symbol('1'),
  number : Symbol('3'),
  openParenthesis : Symbol('5'),
  closingParenthesis : Symbol('6'),
  multiply : Symbol('7'),
  sub : Symbol('8'),
  power : Symbol('9'),
  range : Symbol('10'),
  add : Symbol('11'),
  divide : Symbol('12'),
  err : Symbol('error')
}

function isLetter(char){
  return /^[a-zA-Z]/.test(char)
}

function isDigital(char){
  return /^[0-9]/.test(char)
}

function transport(inputChar, currentState){
  if(currentState == state.start){
    switch(inputChar){
      case '(':
        return state.openParenthesis
      case ')':
        return state.closingParenthesis
      case '*':
        return state.multiply
      case '-':
        return state.sub
      case '^':
        return state.power
      case '~':
        return state.range
      case '+':
        return state.add
      case '/':
        return state.divide
      default :
        if(isLetter(inputChar))
          return state.letter
        else if(isDigital(inputChar))
          return state.number
        else return state.err
    }
  }else if(currentState == state.number){
    return isDigital(inputChar) ? state.number : state.err
  } else if(currentState == state.letter){
    return isLetter(inputChar) ? state.letter : state.err
  } else 
    throw new Error('transport err')
}


class Lexer {
  constructor(source){
    if(typeof source !== "string")
      throw new Error(`source need to be string but it's ${typeof source}`)
    this.source = source
    this.position = 0
    this.state = state.start
    this.buffer = []
  }

  next(){
    if(this.buffer.length == 0 && !this.hasNext()){
      throw new Error('eof')
    }
    if(this.buffer.length == 0)
      this.buffer = [this.fetchToken()]
    return this.buffer.splice(0, 1)[0]
  }

  peek(index){
    index = typeof index == 'undefined' ? 0 : index
    if(index < this.buffer.length)
      return this.buffer[index]
    let sizeOfToken2fetch = index - this.buffer.length + 1
    while(sizeOfToken2fetch > 0 && this.hasNext()){
      this.buffer.push(this.fetchToken())
      sizeOfToken2fetch--
    }
    return sizeOfToken2fetch > 0 ? undefined : this.buffer[index]
  }

  fetchToken(){
    let identifier = undefined
    this.ignoreSpace()
    let move = this.position
    if(move >= this.source.length)
      throw new Error(`has no token!`)
    let recordPosition = this.position
    let recordState = this.state
    while(move < this.source.length){
      const currentChar = this.source[move]
      const nextState = transport(currentChar, this.state)
      if(nextState == state.err){
        identifier = this.getIdentifier(this.position, move)
        recordPosition = this.position
        recordState = this.state
        this.position = move
        this.state = state.start
        return this.identifier2token( identifier, recordPosition,  recordState)
      }else if(nextState == state.letter || nextState == state.number) {
        this.state = nextState
        move++
      }else {
        identifier = this.getIdentifier(this.position, move + 1)
        recordPosition = this.position
        this.position = move + 1
        this.state = state.start
        return this.identifier2token( identifier, recordPosition,  nextState)
      }
    }
    recordPosition = this.position
    recordState = this.state
    identifier = this.getIdentifier(this.position, move)
    this.position = move
    this.state = state.start
    return this.identifier2token( identifier, recordPosition,  recordState)

  }

  identifier2token(id, position, st){
    if(st == state.number)
      return literal(id,position)
    else if(st == state.letter)
      return variable(id, position)
    else return op(id, position)
  }

  getIdentifier(from, to){
    return this.source.substring(from,to)
  }

  hasNext(){
    this.ignoreSpace()
    return this.buffer.length > 0 || this.position < this.source.length
  }

  ignoreSpace(){
    const source = this.source
    while(
      source.length > this.position && 
      source[this.position] === ' '
    ) this.position++
  }

}

export function createLexer(source){
  return new Lexer(source)
}

/* ast */
const astType = {
  MULTI : 3,
  DIVID : 4,
  NUM : 5,
  RANGE : 6,
  POW : 7,
  ADD : 8,
  SUB : 9,
  Parenthesis : 10,
  Variable : 11
}

const RCValueT = {
  PureNumber : 0,
  RangeValue : 1
}
class RCValue {
  constructor(number, leftN, rightN, ty_){
    this.number = number
    this.leftN = leftN
    this.rightN = rightN
    this.type = ty_
  }

  add(other){
    // console.log(`-> add ${JSON.stringify(this)} ${JSON.stringify(other)}`);
    return this.threeCases(other, (a, b) => a + b)
  }

  divide(other){
    // console.log(`-> divide ${JSON.stringify(this)} ${JSON.stringify(other)}`);
    if(this.type == RCValueT.RangeValue)
      return createRangeRCValue(this.leftN / other.number, this.rightN / other.number)
    return createPureRCValue(this.number / other.number)
  }

  multi(other){
    // console.log(`-> multi ${JSON.stringify(this)} ${JSON.stringify(other)}`);
    return this.threeCases(other, (a, b) => a * b)
  }

  threeCases(other, method){
    if(this.type == RCValueT.RangeValue)
      return createRangeRCValue(method(this.leftN , other.number), method(this.rightN, other.number))
    else if(other.type == RCValueT.RangeValue)
      return createRangeRCValue(method(this.number, other.leftN), method(this.number, other.rightN))
    return createPureRCValue(method(this.number, other.number))
  }

  power(other){
    // console.log(`-> power ${JSON.stringify(this)} ${JSON.stringify(other)}`);
    return this.threeCases(other, (a, b) => a ** b)
  }

  sub(other){
    // console.log(`-> sub ${JSON.stringify(this)} ${JSON.stringify(other)}`);
    return this.threeCases(other, (a, b) => a - b)
  }

}

function createPureRCValue(value){
  return new RCValue(value, undefined, undefined, RCValueT.PureNumber)
}

function createRangeRCValue(left, right) {
  return new RCValue(undefined, left, right, RCValueT.RangeValue)
}

class TreeNode {
  constructor(value, type, children){
    this.value = value
    this.type = type
    this.children = children
  }
}

class AddExpression extends TreeNode{
  accept(visitor){
    return visitor.visitAdd(this)
  }
}

class MultiExpression extends TreeNode{
  accept(visitor){
    return visitor.visitMulti(this)
  }
}

class DividExpression extends TreeNode{
  accept(visitor){
    return visitor.visitDivid(this)
  }
}

class NumExpression extends TreeNode{
  accept(visitor){
    return visitor.visitNum(this)
  }
}

class RangeExpression extends TreeNode{
  accept(visitor){
    return visitor.visitRange(this)
  }
}

class PowExpression extends TreeNode{
  accept(visitor){
    return visitor.visitPow(this)
  }
}

class SubExpression extends TreeNode{
  accept(visitor){
    return visitor.visitSub(this)
  }
}

class VariableExpression extends TreeNode{
  accept(visitor){
    return visitor.visitVar(this)
  }
}

/* paser */
function isNumber(token){
  return token.type == Literal
}

function isVariable(token){
  return token.type == Variable
}

function isOp(token){
  return token.type == OP
}

export class Paser {
  constructor(lexer){
    this.lexer = lexer
  }

  pase(){
    if(!this.lexer.hasNext())
      throw new Error('paser err')
    return this.buildE(this.lexer)
  }

  /**
   * F -> (E) | id | (id ~ id)
   */
  buildF(lexer){
    if(!lexer.hasNext())
      return new Error('buildF empty')
    const start = lexer.next()
    // console.log(`build f start is ${start.id}`);
    if(!isOp(start)){
      // console.log(`create end ast node ${JSON.stringify(start)}`);
      /** F -> id */
      // return createEndAstNode(start.id)
      if(isVariable(start))
        return new VariableExpression(start.id, astType.Variable, undefined)
      return new NumExpression(start.id, astType.NUM, undefined)
    }
    if(start.id != '(')
      throw new Error(`build (F -> (E) | id | (id ~ id)) error , should not start with ${start.id} position (${start.position})`)
    const next = lexer.peek(0)
    const nextNext = lexer.peek(1)
    if(!isOp(next) && nextNext.id == '~'){
      const range = this.getRange(lexer)
      if(lexer.next().id != ')'){
        throw new Error('range has no closingParenthesis!')
      }
      return range
    }
    // console.log(`start f -> e , next token is ${JSON.stringify(lexer.peek())} , current token is ${JSON.stringify(start)}`);
    const ans = this.buildE(lexer)
    if(!lexer.hasNext() || lexer.next().id != ')') // pop )
      throw new Error('pase () error : has no )')
    return ans
  }

  /**
   * E -> E + T | E - T | T
   */
  buildE(lexer){

    function opOk(tok){
      switch(tok.id){
        case '-':
        case '+':
          return true
        default:
          return false
      }
    }

    if(lexer.hasNext()){
      const left = this.buildT(lexer)
      if(!left)
        throw new Error('buildE error left is build as undefined')
      if(lexer.hasNext() && opOk(lexer.peek()) ){
        const op = lexer.next()
        // console.log(`building e op is ${op.id}`);
        if(!isOp(op))
          throw new Error(`pase error! it's not op ${op.id} ${op.position} ${op.type} : OP ${OP}  .`)
        const right = this.buildE(lexer)
        // return createNotEndAstNode(op.id, [left, right])
        switch (op.id) {
          case '+':
            return new AddExpression(op.id, astType.ADD, [left, right])
          case '-':
            return new SubExpression(op.id, astType.SUB, [left, right])
          default:
            throw new Error('operator error')
        }
      }
      return left
    }else 
      throw new Error('lexer empty when build e')
  }

  /**
   * T -> T * F | T ^ F | T/F | F
   */
  buildT(lexer){
    function opOk(tok){
      switch(tok.id){
        case '*':
        case '^':
        case '/':
          return true
        default:
          return false
      }
    }

    if(lexer.hasNext()){
      // console.log(`build t start, next token is ${JSON.stringify( lexer.peek() )}`);
      let left = this.buildF(lexer)
      function merge(right, op) {
        switch (op.id) {
          case '*':
            return new MultiExpression('*', astType.MULTI, [left,right])
          case '^':
            return new PowExpression('^', astType.POW, [left, right])
          case '/':
            return new DividExpression('/',astType.DIVID, [left, right])
          default:
            throw new Error(`error in operator `)
        }
      }
      // console.log(`build t , left is ${JSON.stringify(left)}`);
      while(lexer.hasNext() && opOk(lexer.peek())){
        const op = lexer.next()
        if(!opOk(op))
          throw new Error(`build T op is ${op.id}`)
        const right = this.buildF(lexer)
        // return createNotEndAstNode(op.id, [left, right])
        left = merge(right,op)
      }
      return left
    }else 
      throw new Error('lexer empty when build T')
  }

  // ( id ~ id )
  getRange(lexer){
    // console.log(`building range `);
    const left = this.buildF(lexer)
    const rangeOp = lexer.next()
    if(rangeOp.id != '~')
      throw new Error('getRange error')
    const right = this.buildF(lexer)
    // return createNotEndAstNode('~',[left, right])
    return new RangeExpression("~", astType.RANGE, [left, right])
  }

}

export class Emulator {
  constructor(){
    this.variableValues = new Map()
  }

  set(name, value){
    this.variableValues.set(name, value)
    return this
  }


  visitBinary(node, method){
    let { children : [left, right] } = node
    const lV = left.accept(this)
    const rV = right.accept(this)
    // console.log(`-> visiting binary ${JSON.stringify(method)} ${JSON.stringify(lV)} ${JSON.stringify(rV)}`);
    return lV[method](rV)
  }

  visitMulti(node){
    return this.visitBinary(node,'multi')
  }

  visitAdd(node){
    return this.visitBinary(node,'add')
  }

  visitDivid(node){
    return this.visitBinary(node, 'divide')
  }

  visitRange(node){
    let {children : [left, right]} = node
    const lV = left.accept(this)
    const rV = right.accept(this)
    if(lV.type != RCValueT.PureNumber || rV.type != RCValueT.PureNumber){
      throw new Error("between range(~) operator, the value should be PureNumber")
    }
    return createRangeRCValue(lV.number,rV.number)
  }

  visitPow(node){
    return this.visitBinary(node, 'power')
  }

  visitSub(node){
    return this.visitBinary(node, 'sub')
  }

  visitNum(node){
    // return new NumExpression(node.number, astType.NUM, undefined)
    // console.log(`-> visit number ${JSON.stringify(node)}`);
    return createPureRCValue(Number(node.value))
  }

  visitVar(node){
    let name = node.value
    let value = this.variableValues.get(name)
    // console.log(`-> visit var ${JSON.stringify(node)}`);
    if( !value )
      throw new Error(`couldn't find variable ${name} `)
    return createPureRCValue(value)
  }

}
