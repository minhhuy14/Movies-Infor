
const fs = require('fs/promises');

const pgp = require('pg-promise')({
    capSQL: true
});


const origin_connect = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PW,
    max: 30
}

const db = pgp(origin_connect);

const new_connect = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PW,
    max: 30
}
const newDB = pgp(new_connect);

module.exports = {
    db,
    // removeDuplicates: function (data) {
    //     let jsonObject = data.map(JSON.stringify);
    //     let uniqueSet = new Set(jsonObject);
    //     let uniqueArray = Array.from(uniqueSet).map(JSON.parse);
    //     return uniqueArray;
    // },
    // readDataFromFile: async function (fileName) {

    //     let path = `./db/${fileName}.json`;
    //     //  console.log(path);



    // },

    createTable: async (table_name, columns) => {
        let db_connection = null;

        try {
            db_connection = await newDB.connect();

            const query = `CREATE TABLE IF NOT EXISTS ${table_name} (${columns})`;
            await db_connection.any(query);
            console.log(`Created table ${table_name} successfully`);
        } catch (error) {
            throw (error);
        } finally {
            db_connection.done();
        }
    },

    createTableAndImportDataToDatabase: async function () {
        try {
            const results = await fs.readFile(`./data/${process.env.JSON_FILE}`, { encoding: 'utf8' });
            let data = JSON.parse(results);

            // console.log(data.Movies[0].id);

            let movies_columns = `
            id TEXT PRIMARY KEY,
            title TEXT,
            original_title TEXT,
            full_title TEXT,
            year INT,
            image TEXT,
            release_date DATE,
            runtime TEXT,
            plot TEXT,
            award TEXT,
            director_list TEXT [],
            writer_list TEXT [],
            company TEXT,
            language TEXT,
            imdb_rating DOUBLE PRECISION,
            box_office DOUBLE PRECISION,
            plot_full TEXT,
            country TEXT,
            simliar TEXT []
        `

            await this.createTable('movies', movies_columns);

            let favorite_movies_columns = `
            id TEXT PRIMARY KEY,
            title TEXT
        `

            await this.createTable('favorite_movies', favorite_movies_columns);

            let actor_columns = `
            movie_id TEXT,
            actor_id TEXT,
            character TEXT,
            PRIMARY KEY (movie_id,actor_id,character)
            `
            await this.createTable('actors', actor_columns);

            let genres_columns = `
                movie_id TEXT,
                genre TEXT,
                PRIMARY KEY (movie_id,genre)
            `
            await this.createTable('genres', genres_columns);


            for (let i = 0; i < data.Movies.length; i++) {
                let mv = data.Movies[i];
                let movie_rating = mv.imDbRating;
                if (movie_rating == null) {
                    movie_rating = 0;
                }
                if (typeof movie_rating === 'string') {
                    if (movie_rating == '') {
                        movie_rating = 0;
                    }
                    else {
                        movie_rating = parseFloat(movie_rating);
                    }
                }

                let box_office = mv.boxOffice;
                let box_office_number = this.convertToNumber(box_office);
                insertQuery = `INSERT INTO movies values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) ON CONFLICT DO NOTHING`;
                values = [
                    mv.id,
                    mv.title,
                    mv.originalTitle,
                    mv.fullTitle,
                    mv.year,
                    mv.image,
                    mv.releaseDate,
                    mv.runtimeStr,
                    mv.plot,
                    mv.awards,
                    mv.directorList,
                    mv.writerList,
                    mv.companies,
                    mv.languages,
                    movie_rating,
                    box_office_number,
                    mv.plotFull,
                    mv.countries,
                    mv.similars
                ];
                // console.log(insertQuery);
                newDB.none(insertQuery, values)
                    .then(() => {
                        // console.log('Insert movies '+i +' successfully');
                    })
                    .catch(error => { console.log('Error inserting into movies' + error) });



                for (let j = 0; j < mv.actorList.length; j++) {
                    if (!mv.actorList[j].asCharacter) {
                        continue;
                    }
                    insertQuery = `INSERT INTO actors values ($1,$2,$3) ON CONFLICT DO NOTHING`;
                    values = [
                        mv.id,
                        mv.actorList[j].id,
                        mv.actorList[j].asCharacter

                    ];
                    // console.log(insertQuery);
                    newDB.none(insertQuery, values)
                        .then(() => {
                            // console.log('Insert actors '+j +' successfully');
                        })
                        .catch(error => { console.log('Error inserting into actors' + error) });
                }

                for (let j = 0; j < mv.genreList.length; j++) {
                    insertQuery = `INSERT INTO genres values ($1,$2) ON CONFLICT DO NOTHING`;
                    values = [
                        mv.id,
                        mv.genreList[j]

                    ];
                    // console.log(insertQuery);
                    newDB.none(insertQuery, values)
                        .then(() => {
                            // console.log('Insert actors '+j +' successfully');
                        })
                        .catch(error => { console.log('Error inserting into genres' + error) });
                }


            }
            let names_columns = `
                id TEXT PRIMARY KEY,
                name TEXT,
                role TEXT,
                image TEXT,
                summary TEXT,
                birth_date DATE,
                death_date DATE,
                awards TEXT,
                height TEXT
            `
            await this.createTable('names', names_columns);

            let cast_in_movies_columns = `
                cast_id TEXT,
                movie_id TEXT,
                role TEXT,
                PRIMARY KEY (movie_id,cast_id,role)
                `
            await this.createTable('cast_in_movies', cast_in_movies_columns);

            for (let i = 0; i < data.Names.length; i++) {
                let nm = data.Names[i];
                insertQuery = `INSERT INTO names values ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`;
                values = [
                    nm.id,
                    nm.name,
                    nm.role,
                    nm.image,
                    nm.summary,
                    nm.birthDate,
                    nm.deathDate,
                    nm.awards,
                    nm.height
                ];
                // console.log(insertQuery);
                newDB.none(insertQuery, values)
                    .then(() => {
                        // console.log('Insert names '+i +' successfully');
                    })
                    .catch(error => { console.log('Error inserting into names' + error) });

                if (nm.castMovies) {
                    for (let j = 0; j < nm.castMovies.length; j++) {
                        insertQuery = `INSERT INTO cast_in_movies values ($1,$2,$3) ON CONFLICT DO NOTHING`;
                        values = [
                            nm.id,
                            nm.castMovies[j].id,
                            nm.castMovies[j].role
                        ];
                        // console.log(insertQuery);
                        newDB.none(insertQuery, values)
                            .then(() => {
                                // console.log('Insert cast_in_movies '+j +' successfully');
                            })
                            .catch(error => { console.log('Error inserting into cast_in_movies' + error) });
                    }
                }

            }

            let reviews_columns = `
                id TEXT,
                movie_id TEXT,
                username TEXT,
                warning_spoiler BOOLEAN,
                date DATE,
                user_rating DOUBLE PRECISION,
                title_review TEXT,
                text_review TEXT,
                PRIMARY KEY (id,movie_id)
            `
            await this.createTable('reviews', reviews_columns);

            let cnt = 1;
            for (let i = 0; i < data.Reviews.length; i++) {
                let rv = data.Reviews[i];
                if (rv.items) {
                    for (let j = 0; j < rv.items.length; j++) {
                        const reviewId = `rv${cnt.toString().padStart(5, '0')}`;
                        let rating = rv.items[j].rate;
                        if (rating == null) {
                            rating = 0;
                        }
                        if (typeof rating === 'string') {
                            if (rating == '') {
                                rating = 0;
                            }
                            else {
                                rating = parseFloat(rating);
                            }
                        }
                        insertQuery = `INSERT INTO reviews values ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`;
                        values = [
                            reviewId,
                            rv.movieId,
                            rv.items[j].username,
                            rv.items[j].warningSpoilers,
                            rv.items[j].date,
                            rating,
                            rv.items[j].title,
                            rv.items[j].content,
                        ];
                        cnt++;
                        newDB.none(insertQuery, values)
                            .then(() => {
                                // console.log('Insert reviews '+cnt +' successfully');
                            })
                            .catch(error => { console.log('Error inserting into reviews' + error) });
                    }
                }

            }

        }
        catch (err) {
            console.error(err);

        }


    },

    initDatabase: async function () {
        let db_connection = null;

        try {
            db_connection = await db.connect();
            // console.log(db_connection);

            const checkDatabaseQuery = `SELECT datname FROM pg_database WHERE datname='${process.env.DB_NAME}'`;

            const checkDatabaseResult = await db_connection.any(checkDatabaseQuery);
            if (checkDatabaseResult.length === 0) {
                const createDatabaseQuery = `CREATE DATABASE ${process.env.DB_NAME}`;
                await db_connection.any(createDatabaseQuery);
                console.log(`Created database ${process.env.DB_NAME} successfully`);
                db_connection.done();


                db_connection = await newDB.connect();
                // console.log(db_connection);


                await this.createTableAndImportDataToDatabase();
                await this.importDataToFavoriteMovies();
                console.log('Import data to database successfully');
                console.log('Database is ready to use');

            }
            else {
                db_connection.done();

                db_connection = await newDB.connect();
                // console.log('case 2');
                // console.log(db_connection);
                console.log(`Database ${process.env.DB_NAME} already exists. It will be used.`);


            }

        }
        catch (error) {
            throw (error);
        }
        finally {
            db_connection.done();
        }

    },

    queryTop05RatingMovies: async function () {
        let db_connection = null;

        try {
            db_connection = await newDB.connect();

            const query = 'SELECT * FROM movies WHERE imdb_rating IS NOT NULL ORDER BY imdb_rating DESC LIMIT 5';
            const data = await db_connection.any(query);
            // console.log(data);
            return data;
        } catch (error) {
            throw (error);
        }
        finally {
            db_connection.done();
        }
    },
    queryTop15BoxOfficeMovies: async function () {
        let db_connection = null;

        try {
            db_connection = await newDB.connect();

            const query = 'SELECT * FROM movies WHERE box_office IS NOT NULL ORDER BY box_office DESC LIMIT 15';
            const data = await db_connection.any(query);
            // console.log(data);
            return data;
        } catch (error) {
            throw (error);
        }
        finally {
            db_connection.done();
        }
    },

    queryTop15RanksFromFavoriteMovies: async function () {

        let db_connection = null;

        try {
            db_connection = await newDB.connect();

            const query = 'SELECT * FROM favorite_movies fv join movies m on fv.id=m.id WHERE imdb_rating IS NOT NULL ORDER BY imdb_rating DESC LIMIT 15';
            const data = await db_connection.any(query);
            // console.log(data);
            return data;
        } catch (error) {
            throw (error);
        }
        finally {
            db_connection.done();
        }

    },
    queryListFavoriteMovies: async function () {
        let db_connection = null;

        try {
            db_connection = await newDB.connect();

            const query = 'SELECT * FROM favorite_movies fv join movies m on fv.id=m.id ORDER BY m.imdb_rating DESC';
            const data = await db_connection.any(query);
            return data;
        } catch (error) {
            throw (error);
        }
        finally {
            db_connection.done();
        }
    },

    getMovieInfo: async function (m_id) {
        let db_connection = null;

        try {
            db_connection = await newDB.connect();
            let dataObj = {
                generalData: {},
                castList: [],
                reviewList: [],
                genreList: []
            };
            const query_in_movies = `SELECT * FROM movies WHERE id=$1 `;
            const general = await db_connection.any(query_in_movies, [m_id]);
            // console.log(data);
            dataObj.generalData = general;

            const query_in_casts = `SELECT * FROM actors at JOIN names n ON at.actor_id = n.id WHERE at.movie_id = $1`;
            const castsList = await db_connection.any(query_in_casts, [m_id]);
            dataObj.castList = castsList;

            const query_in_reviews = `SELECT * FROM reviews WHERE movie_id=$1 `;
            const reviewList = await db_connection.any(query_in_reviews, [m_id]);

            dataObj.reviewList = reviewList;

            const query_in_genres = `SELECT * FROM genres WHERE movie_id=$1 `;
            const genreList = await db_connection.any(query_in_genres, [m_id]);
            dataObj.genreList = genreList;


            return dataObj;
        } catch (error) {
            throw (error);
        }
        finally {
            db_connection.done();
        }
    },
    getActorInfo: async function (c_id) {
        let db_connection = null;

        try {
            db_connection = await newDB.connect();
            let dataObj = {
                generalData: {},
                movieList: []
            };
            const query_in_names = `SELECT * FROM names WHERE id=$1 `;
            const general = await db_connection.any(query_in_names, [c_id]);
            // console.log(data);
            dataObj.generalData = general;

            const query_in_movies = `SELECT * FROM cast_in_movies cm JOIN movies m ON cm.movie_id = m.id WHERE cm.cast_id = $1`;
            const movieList = await db_connection.any(query_in_movies, [c_id]);
            dataObj.movieList = movieList;
            // console.log('getActorInfo');
            // console.log(movieList);   

            return dataObj;
        } catch (error) {
            throw (error);
        }
        finally {
            db_connection.done();
        }
    },
    getActorInfoByName: async function (name) {
        let db_connection = null;

        try {
            db_connection = await newDB.connect();

            const query_in_movies = `SELECT * FROM cast_in_movies cm JOIN movies m 
                                    ON cm.movie_id = m.id 
                                    JOIN names n ON n.id=cm.cast_id WHERE n.name LIKE '%${name}%'`;
            const dataObj = await db_connection.any(query_in_movies);
            // dataObj.movieList = movieList;
            // console.log('getActorInfo');
            // console.log(movieList);   

            return dataObj;
        } catch (error) {
            throw (error);
        }
        finally {
            db_connection.done();
        }
    },
    getMovieByNameOrGenre: async function (query) {
        let db_connection = null;

        try {
            db_connection = await newDB.connect();
            const query_in_movies = `SELECT * FROM movies m join genres g on m.id=g.movie_id WHERE m.full_title LIKE '%${query}%' or g.genre LIKE '%${query}%'`;
            const data = await db_connection.any(query_in_movies);
            // console.log(data);
            return data;
        } catch (error) {
            throw (error);
        }
        finally {
            db_connection.done();
        }


    },

    //Use to convert box office value to number
    convertToNumber: function (str) {

        if (str.trim().toUpperCase() == 'NA') {
            return 0;
        }
        const numericString = str.replace(/[^0-9.-]/g, '');
        const numericValue = parseFloat(numericString);
        return isNaN(numericValue) ? 0 : numericValue;
    },

    importDataToFavoriteMovies: async function () {

        let db_connection = null;

        try {
            db_connection = await newDB.connect();
            const select = `SELECT id, title FROM movies 
            WHERE year IS NOT NULL AND runtime IS NOT NULL 
            AND imdb_rating IS NOT NULL ORDER BY year DESC LIMIT 30`;
            const data = await db_connection.any(select);

            for (let i = 0; i < data.length; i++) {
                const insert = `INSERT INTO favorite_movies values ($1,$2) ON CONFLICT DO NOTHING`;
                const values = [
                    data[i].id,
                    data[i].title
                ];
                await db_connection.none(insert, values);
            }
            // console.log(data);
            return data;
        } catch (error) {
            throw (error);
        }
        finally {
            db_connection.done();
        }

    }

}