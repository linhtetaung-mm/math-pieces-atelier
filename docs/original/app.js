/*
	Finished Date	  - October 6, 2022
	Creator 		  - Lin Htet Aung(Miit)
	Language  		  - JavaScript
	Satisfication	  - I made a very big smile after completion of this program

	About Game
	----------

	Name - Math Pieces
	App  - Brain Training - Logic Puzzles (from - PlayStore)
	Game Theory - You are given a pattern where the (four) equations will be placed 
					and entities(numbers and operators, e.g - 1,2,3,4, 5, +, +, -, =, =, ...)

	Highlights  - I used recursion in {func.findEquations} to get and assign equations one by one, that takes 70% of time and I enjoy!
				  And look closely to codi[], that array saved me from the worst nightmares but gave me headache.
				  {func.possibleEquations and all functions inside it} are for show, to seperate which equation uses which operation,
				  Later, I combined all equations.plus, equations.minus, equations.into and equations.divide.
				  The most important function - {func.isPossible}
				  While {func.insertEquations} is the last function added to the program, 
				  {func.isPossible} is the key doing all the works between recursion.
				  {func.checkNodes} is not necessary.
			
*/

var rows = 7, cols = 6;
var pattern = [ [0,0,0,0,1,0],//lvl 29
				[0,1,1,1,1,1],
				[0,1,0,0,1,0],
				[0,1,1,1,1,1],
				[0,1,0,0,1,0],
				[0,1,0,0,0,0],
				[0,0,0,0,0,0]
				];
var numbers = [2,2,4,4,6,7,12,14,16,18];
var signs = ['+', '*', '*', '=', '=', '='];
var operators = [1,0,2,0];

Algorithm();
function Algorithm(){
	var codi = [];
	var equations;

	console.log("Pattern - ");
	console.table(pattern);

	codi = horizontalEquations(codi);
	codi = verticalEquations(codi);

	console.log("Positions of each Equation - ")
	console.log(codi);

	var nodes = checkNodes(codi, codi.length);
	if(nodes.length === codi.length){
		equations = possibleEquations(numbers, operators);
	}

	var entities = numbers.concat(signs);console.log(entities);
	var all_equations = [].concat(equations.plus, equations.minus, equations.into, equations.divide);
	var container = new Array(rows).fill(0).map(() => new Array(cols).fill(0));
	findEquations(container, codi, entities, all_equations, 0);
}

function findEquations(display, coordi, enti_array, all_eqs, depth){
	if(depth === coordi.length){
		if(enti_array.length === 0){
			console.log("Solution: ");
			console.table(display);
		}
		else{
			console.log('Depth: '+depth);
			console.table(display);
			console.log(enti_array);
		}
	}
	else{
		for(let i=0; i<all_eqs.length; i++){
			var enti = deepCopy(enti_array);
			var original = deepCopy(display);
			if(isPossible(display, coordi[depth], all_eqs[i], enti)){
				display = insertEquation(coordi[depth], display, all_eqs[i]);
				findEquations(display, coordi, enti, all_eqs, depth+1);				
			}
			display = original;
		}
	}
}

function isPossible(indisplay, position, arr, array){//position === codi[?];

	var codiX = position.x;
	var codiY = position.y;
	var existed = new Array(arr.length).fill(0);
	if(Array.isArray(codiX)){
		for(let i=0; i<codiX.length; i++){
			existed[i] = indisplay[codiX[i]][codiY];
		}
	}
	
	for(let i=0;i <5; i++){
		var element = arr[i];
		if(existed[i]){
			if(existed[i] === element)
				continue;
			else
				return false;
		}
		else{
			if(array.includes(element))		
				array.splice(array.indexOf(element), 1);
			else
				return false;
		}
	}
	return true;
}

function insertEquation(position, indisplay, data){//position === codi[?]
	var codiX = position.x;
	var codiY = position.y;
	if(Array.isArray(codiY)){
		for(let i=0; i<data.length; i++){
			indisplay[codiX][codiY[i]] = data[i];
		}
	}
	else{
		for(let i=0; i<data.length; i++){
			indisplay[codiX[i]][codiY] = data[i];
		}
	}
	return indisplay;
}

function horizontalEquations(arr){
	let temp = [];
	let count = 0;
	for(var i=0; i<rows; i++){
		for(var j=1; j<cols; j++){
			if(pattern[i][j] === 1 && pattern[i][j-1] === 1){//if consecutive horizontals => store previous index
				temp.push(j-1);
				count++;
				if(count === 4){			//store last index
					temp.push(temp[3]+1);
					arr.push({x: i, y: temp});
					temp = temp.slice(5);	//empty array
					count = 0;
				}	
			}
		}
	}
	return arr;
}

function verticalEquations(arr){
	let temp = [];
	let count = 0;
	for(var j=0; j<cols; j++){
		for(var i=1; i<rows; i++){
			if(pattern[i][j] === 1 && pattern[i-1][j] === 1){
				temp.push(i-1);
				count++;
				if(count === 4){
					temp.push(temp[3]+1);
					arr.push({x: temp, y: j});
					temp = temp.slice(5);
					count = 0;
				}
			}
		}
	}
	return arr;
}

function checkNodes(arr, n){
	var temp = [];
	for(var i=0;i<n;i++){
		if(!Array.isArray(arr[i].x)){	//this is possible because horizontalEqs come first
			for(var j=i+1; j<n; j++){
				if(!Array.isArray(arr[j].y)){
					temp.push([arr[i].x, arr[j].y]);
				}
			}
		}
	}
	return temp;
}

function possibleEquations(n_arr, s_arr){
	var possible_eqs = { plus:[], minus:[], into:[], divide:[]};
	possible_eqs.plus = addNumbers(possible_eqs.plus, n_arr);
	possible_eqs.minus = subtractNumbers(possible_eqs.plus, possible_eqs.plus.length);
	possible_eqs.into = multiplyNumbers(possible_eqs.into, n_arr);
	possible_eqs.divide = divideNumbers(possible_eqs.into, possible_eqs.into.length);

	if(s_arr[0] === 0)
		possible_eqs.plus = possible_eqs.plus.slice(possible_eqs.plus.length);
	else
		reverseEquations(possible_eqs.plus, possible_eqs.plus.length);

	if(s_arr[1] === 0)
		possible_eqs.minus = possible_eqs.minus.slice(possible_eqs.minus.length);
	else
		reverseEquations(possible_eqs.minus, possible_eqs.minus.length);

	if(s_arr[2] === 0)
		possible_eqs.into = possible_eqs.into.slice(possible_eqs.into.length);
	else
		reverseEquations(possible_eqs.into, possible_eqs.into.length);

	if(s_arr[3] === 0)
		possible_eqs.divide = possible_eqs.divide.slice(possible_eqs.divide.length);
	else
		reverseEquations(possible_eqs.divide, possible_eqs.divide.length);

	return possible_eqs;
}

function addNumbers(eqs, arr){//sum
	for(var i=0; i<arr.length; i++){
		for(var j=i+1; j<arr.length; j++){
			let sum = arr[i] + arr[j];
			if(arr.includes(sum, j+1)){
				eqs.push([arr[i], '+', arr[j], '=', sum]);
				if(eqs[i][0] !== eqs[i][2])
					eqs.push([arr[j], '+', arr[i], '=', sum]);
			}
		}
	}

	for(let i=0; i<eqs.length; i++){
		for(let j=i+1; j<eqs.length; j++){
			if(eqs[i][0] === eqs[j][0] && eqs[i][2] === eqs[j][2]){
				eqs.splice(j, 1);
				j--;
			}
		}
	}
	return eqs;
}

function subtractNumbers(eqs, n){//difference
  	var temp = [];
	for(var i=0; i<n; i++){
		temp.push([eqs[i][4], '-', eqs[i][2], '=', eqs[i][0]]);
	}
	return temp;
}

function multiplyNumbers(eqs, arr){//product
	for(var i=0; i<arr.length; i++){
		for(var j=i+1; j<arr.length; j++){
			let product = arr[i] * arr[j];
			if(arr.includes(product, j+1)){
				eqs.push([arr[i], '*', arr[j], '=', product]);
				if(arr[i] !== arr[j])
					eqs.push([arr[j], '*', arr[i], '=', product]);
			}
		}
	}

	for(let i=0; i<eqs.length; i++){
		for(let j=i+1; j<eqs.length; j++){
			if(eqs[i][0] === eqs[j][0] && eqs[i][2] === eqs[j][2]){
				eqs.splice(j, 1);
				j--;
			}
		}
	}
	return eqs;
}

function divideNumbers(eqs, n){//quotient
	var temp = [];
	for(var i=0; i<n; i++){
		temp.push([eqs[i][4], '/', eqs[i][2], '=', eqs[i][0]]);
	}
	return temp;
}

function reverseEquations(array, n){
	var copy = deepCopy(array);
	for(let i=0; i<n; i++){
		let temp = copy[i].pop();
		copy[i].unshift(temp);
		temp = copy[i].pop();
		copy[i].splice(1,0,temp);
		array.push(copy[i]);
	}
	return array;
}

function deepCopy(arr){
	let copy = [];
	arr.forEach(elem => {
		if(Array.isArray(elem))
			copy.push(deepCopy(elem));
		else
			copy.push(elem);
	});
	return copy;
}
