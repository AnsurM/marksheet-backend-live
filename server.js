const express = require('express');
const bodyParser = require('body-parser');
const knex = require('knex');
const Cors = require('cors');
const bcrypt = require('bcrypt-nodejs');

const db = knex({
	client: 'pg',
	connection: {
		host: '127.0.0.1',
		user: 'postgres',
		password: 'test',
		database: 'mymarksheet'
	}
});

const app = express();

app.use(Cors());
app.use(bodyParser.json());



app.post('/register', (req,res) => {


	const {email, password, name} = req.body;
	db.select('*').from('students').where('students.email','=',email)
	.then(response => {
		if(response.length){
			return 	res.status(400).json('Bad request');
		}
		else {		

			bcrypt.hash(password, null, null, function(err, hash) {

				db.insert({
					name: name,
					email: email,
					hash: hash
				})
				.into('students')
				.then(response => {
					if(response.command)
					{
					return res.status(200).json(true);
					}
					else 
					{
					return res.status(400).json(false);
					}
				})
				.catch(err => res.json('Student already registered in our database'))

			});
		}
	})
})

app.post('/signin', (req,res) => {
	const {email,password} = req.body;
	let hashPass;

	db.select('*').from('students').where('students.email','=', email)
	.then(response => {

		bcrypt.compare(password, response[0].hash, function(err, resp) {
		    if(resp)
		    {
		    	return res.status(200).json(response[0]);
		    }
		    else
		    {
		    	return res.status(400).json('Invalid login credentials.');		    	
		    }
		});

	})
	.catch(err => res.json('error occurred while processing your request.'))

})

app.post('/rollno', (req,res) => {	
	db.select('rollno','name', 'email').from('students')
	.then(response => {
		return res.json(response);
	})
	.catch(err => res.json('error getting list'));

})

app.post('/results', (req,res) => {

const rollno = req.body.rollNo.rollNo;
db.select('*').from('students').where('students.rollno','=',rollno)
.then(response => {
	if(response.length)
	{
		db.from('results')
		.where('results.rollno', '=', rollno)
		.then(marksheet => 
		{
			if(marksheet.length)
			{
					db.select('*').from('subjects')
					.then(subjectInfo => {
						for (var i = 0; i < marksheet.length; i++) {
							for (var a = 0; a < subjectInfo.length; a++) {
								if(marksheet[i].subcode === subjectInfo[a].subcode)
								{
									marksheet[i].subName = subjectInfo[a].name;
									marksheet[i].semester = subjectInfo[a].semester;
									marksheet[i].semester = parseInt(marksheet[i].semester, 10);
								}
							}
						}
							return res.json(marksheet);
					})
					.catch(err => console.log('cant get subject name'))
			}
			else
			{
				return res.json('No results uploaded yet!')				
			}
		})
		.catch(err => res.json('unable to get data'))
	}
	else{
		return res.json('no user found');		
	}
})
.catch(err => res.json('An error occurred while processing your request'))

})

app.put('/uploadResults', (req,res) => {

	const {rollno,subcode,theory,lab,total,grade,gp} = req.body;

    if(!rollno || !subcode || (!theory && theory !== 0) || (!lab && lab !== 0) || (!total && total !== 0) || !grade || (!gp && gp !== 0))
    {
    	res.status(400).json('Invalid data entry');
    }
    else
    {
    	db.select('*').from('students').where('students.rollno','=',rollno)
		.then(response => {
			if(response.length)
			{
				db.select('*').from('subjects').where('subjects.subcode','=',subcode)
				.then(response => {
					if(response.length)
					{
						db.insert(
							{
								rollno: rollno,
								subcode: subcode,
								theory: theory,
								lab: lab	,
								total: (theory+lab),
								grade: grade,
								gp: gp 
							}
						)
						.into('results')
						.then(response => {
							if(response.command)
							{
							return res.json('data updated!');
							}
							else 
							{
							return res.json('error uploading data');
							}
						})
						.catch(err => res.json('Results for this subject already recorded for this student.'))
					}
					else
					{
						res.status(400).json('Please enter a valid subject code');
					}
			})
			}
			else{
				res.status(400).json("This Roll no doesn't exist.");
			}
		})
	}
})

const PORT = process.env.PORT;

app.listen(PORT, () => {
	console.log(`running on port ${PORT}`);
})
