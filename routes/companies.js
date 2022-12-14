const db = require('../db.js');

const express = require('express');
const ExpressError = require('../expressError.js');
const slugify = require('slugify');
const router = new express.Router();

console.log('in companies.js')

router.get('/', async function(req,res,next){
    try {
        const results = await db.query(
            `SELECT *
            FROM companies;`
        );
        return res.json({"companies": results.rows});
    } catch(e){
        next(e);
    }
});

router.get('/:code', async function(req,res,next){
    try {

        const code = req.params.code;

        const results = await db.query(
            `SELECT c.code, c.name, c.description, i.industry
            FROM companies AS c
                LEFT JOIN industries_companies AS ic
                    ON c.code = ic.company_code
                LEFT JOIN industries AS i ON ic.industry_code = i.code
            WHERE c.code=$1;`, [code]
        );
        const companyInvoice = await db.query(
            `SELECT *
            FROM invoices
            WHERE comp_code=$1`, [code]
        );

        if (results.rows.length === 0){
            throw new ExpressError('Company code not found!',404);
        }

        const industries = results.rows.map(r => r.industry);
        results.rows[0]['invoices'] = companyInvoice.rows
        results.rows[0]['industries'] = industries;


        return res.json({"company": results.rows[0]});
    } catch(e){
        next(e);
    }
});

router.post('/',async function(req,res,next){
    try {

        const {code, name, description } = req.body;
        const slugified_code = slugify(code,{lower:true,strict:true});

        const results = await db.query(
            `INSERT INTO companies
            VALUES ($1, $2, $3)
            RETURNING code, name, description`, [slugified_code, name, description]
        );
        return res.json({"company": results.rows[0]});
    } catch(e){
        next(e);
    }
});

router.put('/:code',async function(req,res,next){
    try {

        const { name, description } = req.body;

        const results = await db.query(
            `UPDATE companies SET name=$1, description=$2
            WHERE code=$3
            RETURNING code, name, description`, [name, description,req.params.code]
        );
        if (results.rows.length === 0){
            throw new ExpressError('Company code not found!',404);
        }
        return res.json({"company": results.rows[0]});
    } catch(e){
        next(e);
    }
});

router.delete('/:code',async function(req,res,next){
    try{
        const code = req.params.code;

        const results = await db.query(
            `DELETE FROM companies
            WHERE code=$1`, [code]
        );
        if (results.rowCount === 0){
            throw new ExpressError('Company code not found!',404);
        }
        return res.json({"status": "deleted"});
    } catch (e) {
        next(e);
    }
});

router.post('/industries', async function(req,res,next){
    try {
        const results = await db.query(
            `INSERT INTO industries
            VALUES ($1,$2)
            RETURNING code, industry;`,[req.body.code,req.body.industry]
        );
        return res.sjson({"industry": results.rows});
    } catch(e){
        next(e);
    }
});

router.get('/industries/list', async function(req,res,next){
    try {
        const results = 
        await db.query(
            `SELECT i.code, i.industry, c.code
            FROM industries AS i
                LEFT JOIN industries_companies AS ic
                    ON i.code = ic.industry_code
                RIGHT JOIN companies AS c ON ic.company_code = c.code
        `);

        const uniqueIndustries = new Set();
        const industries = results.rows.map(r => uniqueIndustries.add(r.industry));
        const industryKeys = Array.from(uniqueIndustries);
        const resultObj = {};
        
        // loop through industries and add keys to object 
        for (const ele of industryKeys){
            resultObj[ele] = [];
        }

        // add companies if they don't exist in resultObj
        // loop through results array
        for (const row of results.rows){
            const key = row.industry;
            if (!resultObj[key].includes(row.code)){
                resultObj[key].push(row.code);
                }
        }

      
        return res.json({"industries": resultObj});
    } catch(e){
        next(e);
    }
});

router.post('/addIndustry', async function(req,res,next){
    try {
        // 
        const {company_code, industry_code} = req.body;

        const results = await db.query(
            `INSERT INTO industries_companies (company_code,industry_code)
            VALUES ($1,$2)
            RETURNING id, company_code,industry_code`, [company_code,industry_code]);

        return res.json({"industries_companies": results.rows});
    } catch(e){
        next(e);
    }
});

module.exports = router;