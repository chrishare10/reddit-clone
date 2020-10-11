import { Box, Flex, Link } from '@chakra-ui/core'
import NextLink from 'next/link'
import React from 'react';
import { useMeQuery } from '../generated/graphql';

interface NavBarProps {

}

export const NavBar: React.FC<NavBarProps> = ({}) => {
    const [{data, fetching}] = useMeQuery();
    let body = null


    // data is loading
    if (fetching) {
    // user not logged in
    } else if (!data?.me) {
        body = (
        <>
            <NextLink href="/login">
                <Link color="white" mr={2}>Login</Link>
            </NextLink>
            <NextLink href="/register">
                <Link color="white">Register</Link>
            </NextLink>
        </>
        )
    // user is logged in
    } else {
        body = <Box>{data.me.username}</Box>;
    }
    return (
        <Flex bg='tomato' p={4} >
            <Box ml={'auto'}>
                {body}
            </Box>
        </Flex>
    );
       
};