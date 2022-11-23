import { Paser, createLexer, Emulator } from "../src/core";

function pase(str){
  return new Paser(createLexer(str)).pase()
}

function tokenlizing_print(str){
  let lexer = createLexer(str)
  while(lexer.hasNext())
    console.log(lexer.next());
}

function print(obj){
  console.log(JSON.stringify(obj, null, 4));
}

let c = undefined;


// test((c = 'a + b * c - 2'), () => {
//   print(pase(c))
// })

let c2 = undefined

test(c2 = '( a + 1) * 3 - 4 ^ ( 5 / 10 * a)', () => {
  // tokenlizing_print(c2)
  const a = pase('( a + 1 ) * 3 - 4 ^ ( 5 / 10 * a)')
  print(a)
  let emulator = new Emulator()
  emulator.set("a", 10)
  console.log( a.accept(emulator) );
  console.log((10 + 1) * 3 - 4 ** (5 / 10 * 10));
})

let c3 = "(1 ~ 4) + 2"
test(c3, () => {
  const a = pase(c3)
  print(a.accept(new Emulator()))
})
